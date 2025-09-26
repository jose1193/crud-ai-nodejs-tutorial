// legacy-code.js - CÓDIGO PROBLEMÁTICO PARA REFACTORIZAR
const u = require("./models/User");
const bcr = require("bcrypt");
const jwt = require("jsonwebtoken");
/**
 * Validates basic email and password format requirements
 * @param {string} email - The email address to validate
 * @param {string} password - The password to validate
 * @returns {boolean} - Returns true if both email and password meet basic requirements
 */
function validateCredentials(email, password) {
  // Check if both parameters exist and are truthy
  if (!email || !password) {
    return false;
  }

  // Check if both parameters have content (length > 0)
  if (email.length === 0 || password.length === 0) {
    return false;
  }

  // Check if email contains "@" symbol and password has minimum length of 6
  if (!email.includes("@") || password.length < 6) {
    return false;
  }

  // All validations passed
  return true;
}
async function l(r, s) {
  try {
    const e = r.body.email;
    const pwd = r.body.password;
    if (!validateCredentials(e, pwd)) {
      s.status(400).json({ msg: "Bad data" });
      return;
    }
    const usr = await u.findOne({ email: e });
    if (!usr) {
      s.status(401).json({ msg: "No user" });
      return;
    }
    const ok = await bcr.compare(pwd, usr.password);
    if (!ok) {
      s.status(401).json({ msg: "Wrong pwd" });
      return;
    }
    const t = jwt.sign({ id: usr._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    s.json({ token: t, user: { id: usr._id, email: usr.email } });
  } catch (err) {
    s.status(500).json({ msg: "Error" });
  }
}

// Pruebas rápidas - mismos resultados
console.log("=== VERIFICACIÓN DE REFACTORIZACIÓN ===");
console.log('p("user@email.com", "123456"):', p("user@email.com", "123456"));
console.log(
  'validateLoginCredentials("user@email.com", "123456"):',
  validateLoginCredentials("user@email.com", "123456")
);

console.log('p("", "123456"):', p("", "123456"));
console.log(
  'validateLoginCredentials("", "123456"):',
  validateLoginCredentials("", "123456")
);

console.log('p("user@email.com", "123"):', p("user@email.com", "123"));
console.log(
  'validateLoginCredentials("user@email.com", "123"):',
  validateLoginCredentials("user@email.com", "123")
);
