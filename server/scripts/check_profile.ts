import { pool } from '../db';

async function checkProfile() {
  try {
    console.log("Checking profiles...");
    
    // 1. Get employee Rajesh Kumar (EMP001) details
    const empResult = await pool.query(
      "SELECT id, name, email, auth_user_id FROM employees WHERE employee_code = $1",
      ["EMP001"]
    );
    
    if (empResult.rows.length === 0) {
      console.error("❌ Employee EMP001 not found.");
      process.exit(1);
    }
    
    const emp = empResult.rows[0];
    console.log(`Employee EMP001: ${emp.name}, auth_user_id: ${emp.auth_user_id}`);
    
    if (!emp.auth_user_id) {
      console.error("❌ Employee has no auth_user_id.");
      process.exit(1);
    }
    
    // Check if profile exists in OEE profiles table
    const profileResult = await pool.query(
      "SELECT * FROM public.profiles WHERE id = $1",
      [emp.auth_user_id]
    );
    
    if (profileResult.rows.length === 0) {
      console.warn("⚠️ Profile not found in public.profiles. Creating profile...");
      
      // Let's get the first plant from plants table
      const plantResult = await pool.query("SELECT id FROM public.plants LIMIT 1");
      if (plantResult.rows.length === 0) {
        console.error("❌ No plants found in public.plants table.");
        process.exit(1);
      }
      
      const plantId = plantResult.rows[0].id;
      console.log(`Found plant_id: ${plantId}. Inserting profile...`);
      
      await pool.query(
        "INSERT INTO public.profiles (id, full_name, role, plant_id) VALUES ($1, $2, $3, $4)",
        [emp.auth_user_id, emp.name, "operator", plantId]
      );
      
      console.log("✅ Profile successfully created!");
    } else {
      console.log("✅ Profile already exists:", profileResult.rows[0]);
    }
    
  } catch (err) {
    console.error("Error checking profile:", err);
  } finally {
    await pool.end();
  }
}

checkProfile();
