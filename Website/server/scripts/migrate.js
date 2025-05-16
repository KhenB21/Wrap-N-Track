const { migrate, rollback } = require('../db/migrate');

// Get command line arguments
const command = process.argv[2];

// Run the appropriate command
if (command === 'migrate') {
  migrate()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} else if (command === 'rollback') {
  rollback()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Rollback failed:', error);
      process.exit(1);
    });
} else {
  console.log('Usage: node migrate.js [migrate|rollback]');
  process.exit(1);
} 