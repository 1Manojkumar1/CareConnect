// Realistic demo catalog. Idempotent — safe to re-run.
// Skills attach to top-level categories only (two-level taxonomy).

const CATALOG = [
  {
    name: 'Appliance Repair',
    description: 'Diagnosis and repair of household appliances.',
    subcategories: ['Refrigerator Repair', 'Washing Machine Repair', 'Oven & Stove Repair', 'Dishwasher Repair'],
    skills: ['Appliance Diagnostics', 'Motor Replacement', 'Control Board Repair', 'Seal & Gasket Replacement'],
  },
  {
    name: 'Plumbing',
    description: 'Leaks, drains, fixtures, and water heaters.',
    subcategories: ['Leak Repair', 'Drain Cleaning', 'Fixture Installation', 'Water Heater Service'],
    skills: ['Pipe Repair', 'Leak Detection', 'Drain Unclogging', 'Fixture Installation', 'Water Heater Service'],
  },
  {
    name: 'Electrical',
    description: 'Wiring, lighting, panels, and safety inspections.',
    subcategories: ['Wiring & Rewiring', 'Lighting Installation', 'Panel & Breaker Service', 'Safety Inspection'],
    skills: ['Wiring', 'Lighting Installation', 'Circuit Breaker Service', 'Electrical Safety Inspection'],
  },
  {
    name: 'Cleaning',
    description: 'Deep, recurring, and move-related home cleaning.',
    subcategories: ['Deep Cleaning', 'Move-In/Move-Out Cleaning', 'Recurring Home Cleaning'],
    skills: ['Deep Cleaning', 'Kitchen & Bath Detailing', 'Floor Care', 'Window Cleaning'],
  },
  {
    name: 'Heating & Cooling',
    description: 'AC and heating service and installation.',
    subcategories: ['AC Repair', 'AC Installation', 'Heating Service'],
    skills: ['AC Diagnostics', 'Refrigerant Recharge', 'Duct Cleaning', 'Thermostat Installation'],
  },
  {
    name: 'Electronics',
    description: 'TV, audio, and home theater service.',
    subcategories: ['TV Repair', 'Audio & Home Theater'],
    skills: ['TV Diagnostics', 'Screen Replacement', 'Sound System Setup'],
  },
  {
    name: 'Carpentry',
    description: 'Furniture, doors, fittings, and custom woodwork.',
    subcategories: ['Furniture Repair', 'Door & Window Fitting', 'Custom Shelving'],
    skills: ['Wood Joinery', 'Furniture Assembly', 'Door Fitting', 'Cabinet Repair'],
  },
  {
    name: 'Painting',
    description: 'Interior and exterior painting and drywall repair.',
    subcategories: ['Interior Painting', 'Exterior Painting', 'Touch-Ups & Drywall'],
    skills: ['Surface Preparation', 'Interior Painting', 'Exterior Painting', 'Drywall Patching'],
  },
  {
    name: 'Pest Control',
    description: 'Inspection, treatment, and prevention.',
    subcategories: ['Insect Treatment', 'Rodent Control', 'Preventive Inspection'],
    skills: ['Pest Identification', 'Safe Pesticide Application', 'Rodent Exclusion', 'Nest Removal'],
  },
  {
    name: 'Maintenance',
    description: 'Handyman tasks and preventive home checks.',
    subcategories: ['General Handyman', 'Preventive Home Check'],
    skills: ['General Repairs', 'Caulking & Sealing', 'Minor Plumbing Fixes', 'Minor Electrical Fixes'],
  },
  {
    name: 'Installation',
    description: 'Appliance, fixture, and smart-home installation.',
    subcategories: ['Appliance Installation', 'Fixture & Mounting', 'Smart Home Setup'],
    skills: ['Appliance Installation', 'TV Wall Mounting', 'Smart Thermostat Setup', 'Furniture Installation'],
  },
];

module.exports = { CATALOG };
