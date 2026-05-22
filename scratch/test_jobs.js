const db = require('../database/db');

async function testDatabase() {
  console.log('--- Database Job CRUD Test ---');
  
  // 1. Fetch initial settings
  const settings = await db.getSettings();
  console.log('✓ Brand Name retrieved:', settings.brand.name);
  
  // 2. Fetch all jobs
  const allJobs = await db.getJobs();
  console.log(`✓ Total jobs: ${allJobs.length}`);
  
  if (allJobs.length > 0) {
    const originalJob = allJobs[0];
    console.log(`\nOriginal Job:\n- ID: ${originalJob.id}\n- Title: ${originalJob.title}\n- Dept: ${originalJob.department}\n- Type: ${originalJob.type}`);

    // 3. Fetch single job
    const fetchedJob = await db.getJob(originalJob.id);
    console.log(`\n✓ Single fetch successful for ID: ${fetchedJob.id}. Matches Title: ${fetchedJob.title === originalJob.title}`);

    // 4. Test updating the job properties
    const updatedTitle = originalJob.title + ' (Senior)';
    const updateResult = await db.updateJob(originalJob.id, {
      title: updatedTitle,
      department: originalJob.department,
      location: originalJob.location,
      description: originalJob.description,
      requirements: originalJob.requirements,
      type: originalJob.type
    });
    console.log(`\n✓ Update command result: ${updateResult}`);

    // 5. Re-fetch and check properties
    const verifiedJob = await db.getJob(originalJob.id);
    console.log(`✓ Verified updated properties: "${verifiedJob.title}"`);

    // 6. Restore original title
    await db.updateJob(originalJob.id, {
      title: originalJob.title,
      department: originalJob.department,
      location: originalJob.location,
      description: originalJob.description,
      requirements: originalJob.requirements,
      type: originalJob.type
    });
    console.log('✓ Restored original job state successfully.');
  } else {
    console.log('❌ No seeded jobs found in the SQLite database.');
  }
}

testDatabase().then(() => {
  console.log('\n--- Test Finished successfully ---');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
