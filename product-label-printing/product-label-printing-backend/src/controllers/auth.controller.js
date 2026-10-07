const authService = require("../services/auth.service");

/** "owner@shop.in" -> "ow***@shop.in", "9876543210" -> "98******10": enough to trace, not to harvest. */
const mask = (value) => {
  const v = String(value).trim();
  const at = v.indexOf("@");
  if (at > 0) return `${v.slice(0, Math.min(2, at))}***${v.slice(at)}`;
  return v.length > 4 ? `${v.slice(0, 2)}${"*".repeat(v.length - 4)}${v.slice(-2)}` : "***";
};

const login = async (req, res) => {
  try {
    const { email, identifier, password } = req.body ?? {};
    const login = identifier ?? email;

    if (typeof login !== "string" || !login.trim() || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Email or mobile and password are required",
      });
    }

    const result = await authService.login(login, password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    const login = req.body?.identifier ?? req.body?.email;
    if (error instanceof authService.AuthError) {
      req.log.warn({ login: mask(login), reason: error.message }, "Sign-in rejected");
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    req.log.error({ err: error, login: mask(login) }, "Sign-in failed unexpectedly");
    return res.status(500).json({
      success: false,
      message: "Sign-in is unavailable right now. Please try again.",
    });
  }
};

module.exports = {
  login,
  mask,
};