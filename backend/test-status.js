const db = require('./database');

console.log('Testing batch status update...\n');

// Get first batch
db.get('SELECT * FROM batches LIMIT 1', [], (err, batch) => {
  if (err) {
    console.error('Error getting batch:', err);
    return;
  }
  
  if (!batch) {
    console.log('No batches found in database');
    return;
  }

  console.log('Original batch:', batch);
  
  // Try updating to 'archived'
  db.run('UPDATE batches SET status = ? WHERE id = ?', ['archived', batch.id], function(err) {
    if (err) {
      console.error('Error updating to archived:', err);
      return;
    }
    
    console.log(`\nUpdated ${this.changes} row(s) to 'archived'`);
    
    // Check the result
    db.get('SELECT * FROM batches WHERE id = ?', [batch.id], (err, updated) => {
      if (err) {
        console.error('Error checking update:', err);
        return;
      }
      console.log('After update:', updated);
      
      // Try updating to 'upcoming'
      db.run('UPDATE batches SET status = ? WHERE id = ?', ['upcoming', batch.id], function(err) {
        if (err) {
          console.error('Error updating to upcoming:', err);
          return;
        }
        
        console.log(`\nUpdated ${this.changes} row(s) to 'upcoming'`);
        
        // Check the result
        db.get('SELECT * FROM batches WHERE id = ?', [batch.id], (err, final) => {
          if (err) {
            console.error('Error checking final update:', err);
            return;
          }
          console.log('After second update:', final);
          
          // Restore original status
          db.run('UPDATE batches SET status = ? WHERE id = ?', [batch.status, batch.id], () => {
            console.log('\nRestored original status');
            process.exit(0);
          });
        });
      });
    });
  });
});
