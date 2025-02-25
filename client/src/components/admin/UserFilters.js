import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Stack
} from '@mui/material';
import { Search, FilterList, Clear } from '@mui/icons-material';

const UserFilters = ({ filters, onFilterChange, onReset }) => {
  const handleChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          size="small"
          label="Search"
          variant="outlined"
          value={filters.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          placeholder="Search by name or email"
          InputProps={{
            startAdornment: <Search color="action" sx={{ mr: 1 }} />
          }}
          sx={{ flex: 2 }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={filters.role || ''}
            label="Role"
            onChange={(e) => handleChange('role', e.target.value)}
          >
            <MenuItem value="">All Roles</MenuItem>
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="teacher">Teacher</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status || ''}
            label="Status"
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => onFilterChange(filters)}
          >
            Apply Filters
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Clear />}
            onClick={onReset}
          >
            Reset
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

export default UserFilters;
