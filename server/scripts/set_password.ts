import { pool } from '../db';

async function setPassword() {
  try {
    console.log("Connecting to database...");
    
    // 1. Get employee Rajesh Kumar (EMP001) details
    const empResult = await pool.query(
      "SELECT id, name, email, auth_user_id FROM employees WHERE employee_code = $1",
      ["EMP001"]
    );
    
    if (empResult.rows.length === 0) {
      console.error("❌ Employee EMP001 not found in employees table.");
      process.exit(1);
    }
    
    const emp = empResult.rows[0];
    console.log(`Found employee: ${emp.name} (${emp.email}), auth_user_id: ${emp.auth_user_id}`);
    
    let authUserId = emp.auth_user_id;
    if (!authUserId) {
      console.warn("⚠️ Employee does not have an auth_user_id. Checking auth.users by email...");
      const userResult = await pool.query(
        "SELECT id FROM auth.users WHERE email = $1",
        [emp.email]
      );
      
      if (userResult.rows.length === 0) {
        console.error(`❌ User with email ${emp.email} not found in auth.users.`);
        process.exit(1);
      }
      
      authUserId = userResult.rows[0].id;
      console.log(`Resolved auth_user_id from email: ${authUserId}`);
      
      // Link it back
      await pool.query(
        "UPDATE employees SET auth_user_id = $1 WHERE id = $2",
        [authUserId, emp.id]
      );
      console.log("Linked auth_user_id in employees table.");
    }
    
    // 2. Hash password using pgcrypto crypt with blowfish salt
    console.log("Updating password in auth.users...");
    const updateResult = await pool.query(
      "UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf', 10)) WHERE id = $2 RETURNING email",
      ["Kalvindme05?", authUserId]
    );
    
    if (updateResult.rows.length > 0) {
      console.log(`✅ Success! Password set to 'Kalvindme05?' for ${updateResult.rows[0].email}`);
    } else {
      console.error("❌ Failed to update password in auth.users.");
    }
    
  } catch (err) {
    console.error("Error setting password:", err);
  } finally {
    await pool.end();
  }
}

setPassword();
