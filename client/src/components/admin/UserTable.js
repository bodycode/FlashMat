import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TablePagination,
  Tooltip
} from '@mui/material';
import { Edit, Delete, School, Person, AdminPanelSettings } from '@mui/icons-material';

const getRoleIcon = (role) => {
  switch (role) {
    case 'teacher': return <School />;
    case 'admin': return <AdminPanelSettings />;
    default: return <Person />;
  }
};

const getRoleColor = (role) => {
  switch (role) {
    case 'teacher': return 'primary';
    case 'admin': return 'error';
    default: return 'default';
  }
};

const UserTable = ({ 
  users, 
  onEdit, 
  onDelete, 
  page, 
  rowsPerPage, 
  totalUsers, 
  onPageChange, 
  onRowsPerPageChange 
}) => {
  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    icon={getRoleIcon(user.role)}
                    label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    color={getRoleColor(user.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.lastStudied ? 'Active' : 'Inactive'}
                    color={user.lastStudied ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit User">
                    <IconButton onClick={() => onEdit(user)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete User">
                    <IconButton 
                      color="error"
                      onClick={() => onDelete(user._id)}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalUsers}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Paper>
  );
};

export default UserTable;
