const User = require('../models/User');

const seedAdmin = async () => {
  try {
    // Check if any admin user exists
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('✅ Seeding skipped: Admin user already exists.');
      return;
    }

    // Create default admin user
    const adminUser = {
      name: 'Admin User',
      email: 'Macrodashboard@Admin.com',
      password: 'abc@1234',
      role: 'admin',
      status: 'active'
    };

    await User.create(adminUser);
    console.log('🚀 Seeding completed: Default admin user created successfully.');
    console.log('   Email: Macrodashboard@Admin.com');
    console.log('   Password: abc@1234');
    
  } catch (error) {
    console.error(`❌ Seeding failed: ${error.message}`);
  }
};

module.exports = seedAdmin;
