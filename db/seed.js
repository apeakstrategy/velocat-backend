require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { run, all } = require('./database');

async function seed() {
  console.log('Seeding SQLite Database...');

  // Create Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Products Table
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      features_json TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Vehicles Table
  await run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      years TEXT NOT NULL,
      description TEXT,
      features_json TEXT,
      specs_json TEXT,
      gallery_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Configurator Steps Table
  await run(`
    CREATE TABLE IF NOT EXISTS configurator_steps (
      id TEXT PRIMARY KEY,
      step_order INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      icon_name TEXT
    )
  `);

  // Create Configurator Options Table
  await run(`
    CREATE TABLE IF NOT EXISTS configurator_options (
      id TEXT PRIMARY KEY,
      step_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      features_json TEXT,
      FOREIGN KEY (step_id) REFERENCES configurator_steps(id) ON DELETE CASCADE
    )
  `);

  // Create Inquiries Table
  await run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      client_name TEXT,
      email TEXT,
      phone TEXT,
      notes TEXT,
      selected_options_json TEXT,
      total_estimate REAL,
      status TEXT DEFAULT 'New',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Gallery Table
  await run(`
    CREATE TABLE IF NOT EXISTS gallery (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT,
      vehicle_tag TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@velocad.com.au';
  const existingAdmin = await all('SELECT * FROM users WHERE email = ?', [adminEmail]);
  if (existingAdmin.length === 0) {
    if (!process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_PASSWORD must be set before creating the initial admin user.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
    await run(
      "INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      ['usr_admin', process.env.ADMIN_USERNAME || 'Admin User', adminEmail, passwordHash, 'admin']
    );
    console.log(`✅ Admin user created: ${adminEmail}`);
  }

  // Seed Products
  const existingProducts = await all("SELECT * FROM products");
  if (existingProducts.length === 0) {
    const productsData = [
      {
        id: 'prod_work_cad',
        name: 'Work Canopy CAD Package',
        category: 'work',
        price: 4999,
        description: 'Heavy-duty trade CAD design with high load tolerance specifications.',
        features: JSON.stringify(['Reinforced internal rib geometry', 'Maximum storage capacity specs', 'Weatherproof seal tolerances', 'Dual side door opening kinematics']),
        image_url: '/08.png'
      },
      {
        id: 'prod_touring_cad',
        name: 'Touring Canopy CAD Package',
        category: 'touring',
        price: 5499,
        description: 'Expedition-ready CAD model optimized for rooftop tents and offroad travel.',
        features: JSON.stringify(['Rooftop tent load structural FEA', 'Integrated wiring duct channels', 'Aerodynamic drag reduction profiles', 'Quick-mount bracket geometry']),
        image_url: '/09.png'
      },
      {
        id: 'prod_flatpack_cad',
        name: 'Flatpack Modular CAD Package',
        category: 'flatpack',
        price: 3999,
        description: 'Precision bolt-together modular CAD cut files and laser DXFs.',
        features: JSON.stringify(['Interlocking sheet metal tab & slot specs', 'Simple bolt-together assembly drawings', 'Optimized nesting DXF for zero material waste', 'Lightweight structural ribbing']),
        image_url: '/10.png'
      },
      {
        id: 'prod_kitchen_module',
        name: 'Kitchen Module CAD Add-on',
        category: 'accessories',
        price: 1299,
        description: 'Slide-out kitchen & pantry CAD model with sink cutout specs.',
        features: JSON.stringify(['Stainless sink & stove CAD templates', 'Water storage volume calculation', 'Locking slide rail clearance models', 'Modular drawer cut sheets']),
        image_url: '/11.png'
      }
    ];

    for (const p of productsData) {
      await run(
        "INSERT INTO products (id, name, category, price, description, features_json, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [p.id, p.name, p.category, p.price, p.description, p.features, p.image_url]
      );
    }
    console.log('✅ Seeded 4 CAD Products.');
  }

  // Seed Vehicles
  const existingVehicles = await all("SELECT * FROM vehicles");
  if (existingVehicles.length === 0) {
    const vehiclesData = [
      {
        id: 'veh_hilux',
        name: 'Toyota Hilux',
        slug: 'hilux',
        years: '2020-2024',
        description: 'Australia\'s most popular ute. High-precision 3D CAD fitment models.',
        features: JSON.stringify(['Perfect fit for all cab configurations', 'Aerodynamic design reduces wind noise', 'Heavy-duty construction for work use', 'Easy installation with no drilling required']),
        specs: JSON.stringify({ length: '1800mm', width: '1600mm', height: '1200mm', weight: '85kg', material: '5052-H32 Aluminum', warranty: '5 years' }),
        gallery: JSON.stringify(['/08.png', '/09.png', '/10.png', '/11.png'])
      },
      {
        id: 'veh_ranger',
        name: 'Ford Ranger',
        slug: 'ranger',
        years: '2019-2024',
        description: 'Combines power and sophistication. Parametric 3D CAD designs.',
        features: JSON.stringify(['Designed for all Ranger configurations', 'Integrated lighting options', 'Maximum storage capacity', 'Weatherproof construction']),
        specs: JSON.stringify({ length: '1850mm', width: '1650mm', height: '1250mm', weight: '90kg', material: '5052-H32 Aluminum', warranty: '5 years' }),
        gallery: JSON.stringify(['/08.png', '/09.png', '/10.png', '/11.png'])
      },
      {
        id: 'veh_dmax',
        name: 'Isuzu D-Max',
        slug: 'd-max',
        years: '2020-2024',
        description: 'Rugged commercial utility vehicle with dedicated FEA load models.',
        features: JSON.stringify(['Heavy-duty commercial CAD layout', 'Space Cab & Crew Cab specs', 'Reinforced floor tray mounting points']),
        specs: JSON.stringify({ length: '1820mm', width: '1620mm', height: '1220mm', weight: '88kg', material: '5052-H32 Aluminum', warranty: '5 years' }),
        gallery: JSON.stringify(['/08.png', '/09.png'])
      },
      {
        id: 'veh_navara',
        name: 'Nissan Navara',
        slug: 'navara',
        years: '2018-2024',
        description: 'Smooth riding dual cab utility with custom CAD blueprint packages.',
        features: JSON.stringify(['King Cab & Dual Cab options', 'Custom chassis rail clearance models', 'Heavy-duty door opening struts']),
        specs: JSON.stringify({ length: '1790mm', width: '1590mm', height: '1210mm', weight: '84kg', material: '5052-H32 Aluminum', warranty: '5 years' }),
        gallery: JSON.stringify(['/10.png', '/11.png'])
      }
    ];

    for (const v of vehiclesData) {
      await run(
        "INSERT INTO vehicles (id, name, slug, years, description, features_json, specs_json, gallery_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [v.id, v.name, v.slug, v.years, v.description, v.features, v.specs, v.gallery]
      );
    }
    console.log('✅ Seeded 4 Vehicle Fitment Models.');
  }

  // Seed Configurator Steps & Options
  const existingSteps = await all("SELECT * FROM configurator_steps");
  if (existingSteps.length === 0) {
    const stepsData = [
      { id: 'vehicle', step_order: 1, title: 'Select Vehicle', description: 'Choose your vehicle make and model', icon_name: 'Truck' },
      { id: 'type', step_order: 2, title: 'Canopy Type', description: 'Select the canopy CAD model for your needs', icon_name: 'Wrench' },
      { id: 'modules', step_order: 3, title: 'Add Modules', description: 'Customize with internal accessory CAD modules', icon_name: 'Wrench' },
      { id: 'finish', step_order: 4, title: 'Choose Finish', description: 'Select material specs and surface finish', icon_name: 'Palette' },
      { id: 'delivery', step_order: 5, title: 'Design Delivery', description: 'Select digital CAD delivery & spec format', icon_name: 'FileText' },
      { id: 'submit', step_order: 6, title: 'Submit Request', description: 'Provide contact info for CAD package delivery', icon_name: 'Send' }
    ];

    for (const s of stepsData) {
      await run(
        "INSERT INTO configurator_steps (id, step_order, title, description, icon_name) VALUES (?, ?, ?, ?, ?)",
        [s.id, s.step_order, s.title, s.description, s.icon_name]
      );
    }

    const optionsData = [
      // Vehicle Options
      { id: 'hilux-2023', step_id: 'vehicle', name: 'Toyota Hilux 2023', description: 'Parametric 3D CAD fitment for all Hilux cab styles', price: 0, features: JSON.stringify(['Single Cab DXF Specs', 'Extra Cab CAD Data', 'Dual Cab 3D Mesh', 'Crew Cab Models']) },
      { id: 'ranger-2023', step_id: 'vehicle', name: 'Ford Ranger 2023', description: 'Aerodynamic CAD design with maximum storage geometry', price: 0, features: JSON.stringify(['Single Cab Blueprint', 'Super Cab Parametric Spec', 'Double Cab FEA Mesh']) },
      { id: 'd-max-2023', step_id: 'vehicle', name: 'Isuzu D-Max 2023', description: 'Heavy-duty commercial CAD layout & load analysis', price: 0, features: JSON.stringify(['Single Cab Spec Sheet', 'Space Cab CAD Package', 'Crew Cab Cut List']) },

      // Canopy Type Options
      { id: 'work', step_id: 'type', name: 'Work Canopy CAD Package', description: 'Heavy-duty trade CAD design with high load tolerance', price: 4999, features: JSON.stringify(['Reinforced internal rib geometry', 'Maximum storage capacity specs', 'Weatherproof seal tolerances', 'Dual side door opening kinematics']) },
      { id: 'touring', step_id: 'type', name: 'Touring Canopy CAD Package', description: 'Expedition-ready CAD model optimized for rooftop tents', price: 5499, features: JSON.stringify(['Rooftop tent load structural FEA', 'Integrated wiring duct channels', 'Aerodynamic drag reduction profiles', 'Quick-mount bracket geometry']) },
      { id: 'flatpack', step_id: 'type', name: 'Flatpack Modular CAD Package', description: 'Precision bolt-together modular CAD cut files', price: 3999, features: JSON.stringify(['Interlocking sheet metal tab & slot specs', 'Simple bolt-together assembly drawings', 'Optimized nesting DXF for zero material waste', 'Lightweight structural ribbing']) },

      // Module Options
      { id: 'kitchen', step_id: 'modules', name: 'Kitchen Module CAD Add-on', description: 'Slide-out kitchen & pantry CAD model with sink cutout specs', price: 1299, features: JSON.stringify(['Stainless sink & stove CAD templates', 'Water storage volume calculation', 'Locking slide rail clearance models', 'Modular drawer cut sheets']) },
      { id: 'tool-storage', step_id: 'modules', name: 'Commercial Tool Drawer CAD Add-on', description: 'Heavy-duty drawer & divider layout with weight distribution FEA', price: 899, features: JSON.stringify(['Locking latch placement specs', 'Modular divider DXF files', 'Heavy-duty slide clearance drawings', 'Fastener cut list']) },
      { id: 'solar-panel', step_id: 'modules', name: 'Solar & Roof Rack Mount CAD Add-on', description: 'Structural roof rack & solar panel mounting bracket CAD package', price: 599, features: JSON.stringify(['Wind load dynamic FEA analysis', 'Adjustable solar tilt bracket drawings', 'Waterproof cable entry gland specs', 'Universal crossbar mounting geometry']) },

      // Finish Options
      { id: 'standard', step_id: 'finish', name: 'Marine-Grade Raw Aluminum (Mill Finish)', description: 'CAD specs optimized for raw 5052-H32 aluminum fabrication', price: 0, features: JSON.stringify(['5052-H32 Sheet metal specs', 'Corrosion resistant alloy notes', 'Laser cut kerf allowances', '5-Year Structural CAD Guarantee']) },
      { id: 'premium', step_id: 'finish', name: 'Powder-Coated Specs & Color Codes', description: 'Includes surface treatment blueprints & RAL powder color codes', price: 499, features: JSON.stringify(['RAL Color spec sheets', 'Pre-treatment surface etch guidelines', 'UV-stable coating specs', '7-Year Engineering Guarantee']) },
      { id: 'carbon-fiber', step_id: 'finish', name: 'Carbon Fiber Hybrid Specs & FEA', description: 'Ultra-lightweight composite panel geometry & hybrid specs', price: 1299, features: JSON.stringify(['Composite panel thickness drawings', 'Lightweight structural FEA report', 'Titanium fastener placement drawings', 'High-end cosmetic rendering pack']) },

      // Delivery Options
      { id: 'standard-digital', step_id: 'delivery', name: 'Digital CAD Package Delivery', description: 'Instant email delivery of 3D CAD files (.STEP, .IGES, 3D PDF)', price: 0, features: JSON.stringify(['Universal 3D STEP & IGES files', 'Parametric 3D PDF preview models', 'Basic assembly drawing package', 'Instant digital download link']) },
      { id: 'dxf-fea-express', step_id: 'delivery', name: 'Express DXF Cut-List & FEA Report', description: 'DXF sheet metal cut patterns, bend tables & FEA stress report', price: 299, features: JSON.stringify(['Ready-to-cut DXF files for laser/plasma cutters', 'Exact sheet metal bend deduction tables', 'Finite Element Analysis (FEA) stress load report', '24-hour priority email delivery']) },
      { id: 'full-workshop-pack', step_id: 'delivery', name: 'Full Blueprint & Commercial License', description: 'Complete workshop blueprints, 1:1 DXF patterns, BOM & sign-off', price: 599, features: JSON.stringify(['1:1 scale printable shop floor blueprints', 'Full Hardware Bill of Materials (BOM) & specs', 'Commercial fabrication license included', 'Direct consultation with senior CAD engineer']) }
    ];

    for (const opt of optionsData) {
      await run(
        "INSERT INTO configurator_options (id, step_id, name, description, price, features_json) VALUES (?, ?, ?, ?, ?, ?)",
        [opt.id, opt.step_id, opt.name, opt.description, opt.price, opt.features]
      );
    }
    console.log('✅ Seeded Configurator Steps & Options.');
  }

  // Seed Sample Inquiry
  const existingInquiries = await all("SELECT * FROM inquiries");
  if (existingInquiries.length === 0) {
    await run(
      `INSERT INTO inquiries (id, client_name, email, phone, notes, selected_options_json, total_estimate, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'inq_sample_1',
        'Sarah Jenkins',
        'sarah@outbackfleet.com.au',
        '0412 345 678',
        'Require custom FEA load report for 300kg roof load carrying capacity.',
        JSON.stringify({ vehicle: 'hilux-2023', type: 'work', modules: 'tool-storage', finish: 'standard', delivery: 'dxf-fea-express' }),
        6197.00,
        'New'
      ]
    );
    console.log('✅ Seeded Sample Inquiry.');
  }

  // Seed Gallery Renders
  const existingGallery = await all("SELECT * FROM gallery");
  if (existingGallery.length === 0) {
    const galleryItems = [
      { id: 'gal_1', title: 'Hilux Commercial CAD Assembly Render', category: '3D CAD Renders', image_url: '/08.png', vehicle_tag: 'Toyota Hilux', description: '3D parametric CAD render of Hilux dual cab commercial setup.' },
      { id: 'gal_2', title: 'Ranger Expedition Touring CAD Model', category: 'Expedition Specs', image_url: '/09.png', vehicle_tag: 'Ford Ranger', description: 'Finite element load-tested touring canopy with roof rack brackets.' },
      { id: 'gal_3', title: 'Modular Flatpack Laser Cut Assembly', category: 'DXF Cut Lists', image_url: '/10.png', vehicle_tag: 'Universal Ute', description: 'Interlocking sheet metal tab & slot flatpack assembly blueprints.' },
      { id: 'gal_4', title: 'D-Max Heavy Duty Trade Enclosure', category: '3D CAD Renders', image_url: '/11.png', vehicle_tag: 'Isuzu D-Max', description: 'Heavy-duty trade enclosure with internal tool drawer system.' },
      { id: 'gal_5', title: 'VeloCad Engineering CAD Showroom Model', category: 'FEA Simulations', image_url: '/12.png', vehicle_tag: 'Hilux / Ranger', description: 'Showroom display CAD model illustrating structural ribbing.' },
      { id: 'gal_6', title: 'Authorized Partner Workshop Setup', category: 'Fabrication Specs', image_url: '/13.png', vehicle_tag: 'Custom Utes', description: 'High-precision fabrication blueprint package rendered in 3D.' }
    ];

    for (const g of galleryItems) {
      await run(
        "INSERT INTO gallery (id, title, category, image_url, description, vehicle_tag) VALUES (?, ?, ?, ?, ?, ?)",
        [g.id, g.title, g.category, g.image_url, g.description, g.vehicle_tag]
      );
    }
    console.log('✅ Seeded 6 Gallery CAD Items.');
  }

  console.log('🎉 Database seeding complete!');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Error seeding database:', err);
  });
}

module.exports = { seed };
