export enum PermissionAction {
  CREATE = 1,
  EDIT = 2,
  DELETE = 4,
  BLOCK = 8,
  ALL = 1 | 2 | 4 | 8,
}
