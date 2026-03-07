const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   SAVE PROFILE
====================== */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, role, experience, skills } = req.body;

    const existingProfile = await pool.query(
      "SELECT * FROM profiles WHERE user_id = $1",
      [userId]
    );

    if (existingProfile.rows.length > 0) {
      await pool.query(
        `UPDATE profiles 
         SET full_name = $1, role = $2, experience = $3, skills = $4
         WHERE user_id = $5`,
        [full_name, role, experience, skills, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO profiles (user_id, full_name, role, experience, skills)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, full_name, role, experience, skills]
      );
    }

    res.json({ message: "Profile saved successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

/* ======================
   GET PROFILE
====================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await pool.query(
      "SELECT * FROM profiles WHERE user_id = $1",
      [userId]
    );

    if (profile.rows.length === 0) {
      return res.json(null);
    }

    res.json(profile.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
