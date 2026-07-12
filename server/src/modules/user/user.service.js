const bcrypt = require('bcrypt');   
const userRepository = require('./user.repository'); 
const { AppError } = require('../../middleware/errorHandler'); 

const SALT_ROUNDS = 10;


const userService = {

  /**
   * Create a new employee account.
   *
   * Business rules:
   * - Role is ALWAYS forced to EMPLOYEE (never Admin)
   * - isFirstLogin is ALWAYS true (employee must change temp password)
   * - Email must be unique across the system
   * - temporaryPassword is hashed with bcrypt before storage
   *
   * @param {{ name, email, department, temporaryPassword, phone? }} data
   * @returns {{ employee: object }} 
   */
  createEmployee: async ({ name, email, department, temporaryPassword, phone }) => { 
    // ── Check email uniqueness ────────────────────────────────────
    const existing = await userRepository.findByEmail(email);

    if (existing) {
      throw new AppError(`An account with email "${email}" already exists`, 409);
    }


    // ── Hash temporary password ───────────────────────────────────
    const hashedPassword = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);


    // ── Create employee — role & isFirstLogin are hardcoded ───────
    
    const employee = await userRepository.createEmployee({
      name,
      email,
      password: hashedPassword,
      role: 'EMPLOYEE',       // HARDCODED — never from request body
      isFirstLogin: true,      // HARDCODED — always true for new employees
      department,
      phone: phone || null,
    });

    return { employee };
  }, 

  /**
   * List all users in the system.
   * Admin-only view.
   *
   * @returns {{ users: object[], total: number }}
   */
  getAllUsers: async () => {
    const users = await userRepository.findAll();
    return { users, total: users.length };
  }, 

  /**
   * Get a single user by ID.
   *
   * @param {string} id - UUID
   * @returns {{ user: object }}
   */
  getUserById: async (id) => { 
    const user = await userRepository.findById(id); 
    if (!user) { 
      throw new AppError('User not found', 404); 
    } 
    return { user }; 
  }, 
}; 

module.exports = userService;
