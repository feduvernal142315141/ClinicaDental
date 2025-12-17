/**
 * Manager Users CRUD Service
 *
 * Handles all CRUD operations for manager users:
 * - Create user
 * - Update user
 * - Get user by ID
 * - List users (paginated with filters)
 * - Change password
 */

import {
  serviceGet,
  servicePost,
  servicePut,
  serviceDelete,
} from "@/lib/services/baseService";
import { ServiceResponse } from "@/lib/models/response";
import { QueryModel } from "@/lib/models/queryModel";
import { getQueryString } from "@/lib/utils/format";
import {
  ManagerUser,
  ManagerUserListResponse,
  CreateManagerUserRequest,
  UpdateManagerUserRequest,
  ChangePasswordRequest,
} from "@/lib/entity/manager-users";

// Base path for manager users endpoints
const MANAGER_USERS_PATH = "/manager-users";

/**
 * Creates a new manager user
 * @param data User data to create
 * @returns UUID of created user
 */
export const serviceCreateManagerUser = async (
  data: CreateManagerUserRequest
): ServiceResponse<string> => {
  return servicePost<CreateManagerUserRequest, string>(
    MANAGER_USERS_PATH,
    data
  );
};

/**
 * Updates an existing manager user
 * @param data User data to update (must include ID)
 * @returns true if successful
 */
export const serviceUpdateManagerUser = async (
  data: UpdateManagerUserRequest
): ServiceResponse<boolean> => {
  return servicePut<UpdateManagerUserRequest, boolean>(
    MANAGER_USERS_PATH,
    data
  );
};

/**
 * Gets a manager user by ID
 * @param id User UUID
 * @returns Full user details
 */
export const serviceGetManagerUserById = async (
  id: string
): ServiceResponse<ManagerUser> => {
  return serviceGet<ManagerUser>(`${MANAGER_USERS_PATH}/${id}`);
};

/**
 * Lists manager users with pagination, filtering, and sorting
 * @param query Query parameters (page, pageSize, filters, orders)
 * @returns Paginated list of users
 *
 * @example
 * // Get first page of active users
 * const query: QueryModel = {
 *   page: 0,
 *   pageSize: 10,
 *   filters: ['active,eq,boolean:true'],
 *   orderBy: ['createAt,desc']
 * };
 * const response = await serviceGetManagerUsers(query);
 */
export const serviceGetManagerUsers = async (
  query?: QueryModel
): ServiceResponse<ManagerUserListResponse> => {
  const queryString = query ? `?${getQueryString(query)}` : "";
  return serviceGet<ManagerUserListResponse>(
    `${MANAGER_USERS_PATH}${queryString}`
  );
};

/**
 * Changes the password for a manager user
 * @param data User ID, old password, and new password
 * @returns true if successful
 */
export const serviceChangePassword = async (
  data: ChangePasswordRequest
): ServiceResponse<boolean> => {
  return servicePut<ChangePasswordRequest, boolean>(
    `${MANAGER_USERS_PATH}/change-password`,
    data
  );
};

/**
 * Deletes a manager user by ID
 * @param id User UUID to delete
 * @returns true if successful
 */
export const serviceDeleteManagerUser = async (
  id: string
): ServiceResponse<boolean> => {
  return serviceDelete<void, boolean>(`${MANAGER_USERS_PATH}/${id}`);
};
