const { Ticket, TICKET_TRANSITIONS } = require('../../models/Ticket');
const { User } = require('../../models/User');
const { createNotification } = require('../notifications/notifications.service');
const { sendUserEmail } = require('../../utils/mailer');
const { recordAuditLog } = require('../../utils/auditLogger');
const { ApiError } = require('../../utils/ApiError');

function isStaff(role) {
  return ['SUPPORT', 'ADMIN', 'OPERATIONS'].includes(role);
}

function serialize(ticket) {
  const obj = ticket.toObject ? ticket.toObject() : ticket;
  return { ...obj, id: String(obj._id) };
}

/**
 * Any authenticated user can raise a ticket.
 */
async function createTicket(userId, { subject, description, category, priority, relatedBookingId }) {
  const ticket = await Ticket.create({
    subject,
    description,
    category: category || 'OTHER',
    priority: priority || 'MEDIUM',
    raisedBy: userId,
    relatedBookingId: relatedBookingId || null,
    messages: [{ sender: userId, body: description }],
  });
  return serialize(ticket);
}

/**
 * Staff see the full queue (with filters); everyone else sees only
 * tickets they raised.
 */
async function listTickets(userId, userRole, { status, priority, assignedTo, category, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (assignedTo) filter.assignedTo = assignedTo === 'me' ? userId : assignedTo;
  if (!isStaff(userRole)) filter.raisedBy = userId;

  const skip = (page - 1) * limit;
  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('raisedBy', 'name email role')
      .populate('assignedTo', 'name email')
      .lean(),
    Ticket.countDocuments(filter),
  ]);
  return { tickets, total, page, limit };
}

async function getTicket(ticketId, userId, userRole) {
  const ticket = await Ticket.findById(ticketId)
    .populate('raisedBy', 'name email role')
    .populate('assignedTo', 'name email')
    .populate('messages.sender', 'name email role')
    .populate('relatedBookingId', 'status startAt')
    .lean();
  if (!ticket) throw ApiError.notFound('NOT_FOUND', 'Ticket not found');

  const isOwner = String(ticket.raisedBy._id || ticket.raisedBy) === String(userId);
  if (!isOwner && !isStaff(userRole)) throw ApiError.notFound('NOT_FOUND', 'Ticket not found');
  return ticket;
}

/**
 * Staff-only: assign, change status/priority, resolve with a note.
 */
async function updateTicket(ticketId, actorId, actorRole, { status, priority, assignedTo, resolutionNote }) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw ApiError.notFound('NOT_FOUND', 'Ticket not found');

  const fromStatus = ticket.status;

  if (status) {
    const allowed = TICKET_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(status)) {
      throw ApiError.unprocessable(
        'INVALID_STATE',
        `Cannot transition from ${ticket.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`
      );
    }
    ticket.status = status;
    if (status === 'RESOLVED') {
      ticket.resolvedAt = new Date();
      ticket.resolutionNote = resolutionNote || '';
    }
  }

  if (priority) ticket.priority = priority;
  if (assignedTo !== undefined) {
    if (assignedTo) {
      const assignee = await User.findById(assignedTo);
      if (!assignee || !isStaff(assignee.role)) {
        throw ApiError.unprocessable('INVALID_ASSIGNEE', 'Tickets can only be assigned to staff accounts.');
      }
    }
    ticket.assignedTo = assignedTo || null;
  }

  await ticket.save();

  if (status && status !== fromStatus) {
    recordAuditLog({
      actor: { userId: actorId, role: actorRole },
      action: 'TICKET_STATUS_CHANGE',
      target: { model: 'Ticket', id: ticket._id, label: ticket.subject },
      before: { status: fromStatus },
      after: { status, priority: ticket.priority },
    });
  }

  // Notify the raiser on resolution; notify the new assignee on assignment.
  try {
    if (status === 'RESOLVED') {
      await createNotification({
        userId: ticket.raisedBy,
        type: 'TICKET_UPDATED',
        title: 'Support ticket resolved',
        body: `Your ticket "${ticket.subject}" has been resolved.`,
        link: `/tickets/${ticket._id}`,
        metadata: { ticketId: ticket._id },
      });
      sendUserEmail(ticket.raisedBy, {
        subject: 'Your CareConnect support ticket was resolved',
        text: `Your ticket "${ticket.subject}" has been resolved.\n\n${ticket.resolutionNote || ''}`,
      });
    } else if (assignedTo && String(ticket.assignedTo) !== String(actorId)) {
      await createNotification({
        userId: ticket.assignedTo,
        type: 'TICKET_UPDATED',
        title: 'Ticket assigned to you',
        body: `Support ticket "${ticket.subject}" was assigned to you.`,
        link: `/tickets/${ticket._id}`,
        metadata: { ticketId: ticket._id },
      });
      sendUserEmail(ticket.assignedTo, {
        subject: 'CareConnect ticket assigned to you',
        text: `Support ticket "${ticket.subject}" (${ticket.priority} priority) was assigned to you.`,
      });
    }
  } catch (_err) {
    // Non-blocking notification emission
  }

  return serialize(await Ticket.findById(ticket._id)
    .populate('raisedBy', 'name email role')
    .populate('assignedTo', 'name email'));
}

/**
 * Threaded conversation: the raiser or any staff member may post while
 * the ticket is not CLOSED.
 */
async function addMessage(ticketId, userId, userRole, { body }) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw ApiError.notFound('NOT_FOUND', 'Ticket not found');

  const isOwner = String(ticket.raisedBy) === String(userId);
  if (!isOwner && !isStaff(userRole)) throw ApiError.notFound('NOT_FOUND', 'Ticket not found');
  if (ticket.status === 'CLOSED') {
    throw ApiError.unprocessable('TICKET_CLOSED', 'This ticket is closed and no longer accepts messages.');
  }

  ticket.messages.push({ sender: userId, body });
  // A customer reply re-opens the conversation for staff attention.
  if (isOwner && ticket.status === 'WAITING_ON_USER') ticket.status = 'IN_PROGRESS';
  await ticket.save();

  // Notify the other side of the conversation.
  try {
    const recipient = isStaff(userRole) ? ticket.raisedBy : ticket.assignedTo;
    if (recipient && String(recipient) !== String(userId)) {
      await createNotification({
        userId: recipient,
        type: 'TICKET_UPDATED',
        title: 'New message on support ticket',
        body: `New reply on "${ticket.subject}".`,
        link: `/tickets/${ticket._id}`,
        metadata: { ticketId: ticket._id },
      });
    }
  } catch (_err) {
    // Non-blocking notification emission
  }

  const updated = await Ticket.findById(ticket._id)
    .populate('raisedBy', 'name email role')
    .populate('assignedTo', 'name email')
    .populate('messages.sender', 'name email role')
    .lean();
  return updated;
}

module.exports = { createTicket, listTickets, getTicket, updateTicket, addMessage };
