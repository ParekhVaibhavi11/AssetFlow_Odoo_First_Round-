/**
 * constants/roles.js
 *
 * Single source of truth for role constants.
 * Import this everywhere — never hardcode "ADMIN" or "EMPLOYEE" as strings.
 * If roles change, update only this file.
 */

const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE',
});

module.exports = { ROLES };
