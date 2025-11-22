const express = require('express');
const Course = require('../models/Course');
const { authenticateToken, requireSuperAdminOrPermission } = require('../middleware/auth');

const router = express.Router();

// Get all courses
router.get('/', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ campus: 1, department: 1 });
    
    res.json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// Get courses by campus
router.get('/campus/:campus', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const { campus } = req.params;
    const courses = await Course.find({ campus, isActive: true })
      .sort({ department: 1 });
    
    res.json({ courses });
  } catch (error) {
    console.error('Error fetching courses by campus:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// Get departments for a campus
router.get('/departments/:campus', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const { campus } = req.params;
    const courses = await Course.find({ campus, isActive: true })
      .select('department')
      .sort({ department: 1 });
    
    const departments = [...new Set(courses.map(c => c.department))];
    res.json({ departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

// Create new course
router.post('/', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const { campus, department } = req.body;

    if (!campus || !department) {
      return res.status(400).json({ message: 'Campus and department are required' });
    }

    const course = new Course({
      campus,
      department,
      createdBy: req.user._id
    });

    await course.save();
    await course.populate('createdBy', 'name email');

    res.status(201).json({ course, message: 'Course created successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This campus-department combination already exists' });
    }
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
});

// Update course
router.put('/:id', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const { campus, department, isActive } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (campus) course.campus = campus;
    if (department) course.department = department;
    if (typeof isActive === 'boolean') course.isActive = isActive;

    await course.save();
    await course.populate('createdBy', 'name email');

    res.json({ course, message: 'Course updated successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This campus-department combination already exists' });
    }
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Failed to update course' });
  }
});

// Delete course (soft delete)
router.delete('/:id', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.isActive = false;
    await course.save();

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Failed to delete course' });
  }
});

// Get all unique campuses
router.get('/campuses/list', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const campuses = await Course.distinct('campus', { isActive: true });
    res.json({ campuses: campuses.sort() });
  } catch (error) {
    console.error('Error fetching campuses:', error);
    res.status(500).json({ message: 'Failed to fetch campuses' });
  }
});

// Rename campus (bulk update all courses with old campus name)
router.put('/campuses/rename', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const { oldCampusName, newCampusName } = req.body;

    if (!oldCampusName || !newCampusName) {
      return res.status(400).json({ message: 'Old campus name and new campus name are required' });
    }

    if (oldCampusName.trim() === newCampusName.trim()) {
      return res.status(400).json({ message: 'New campus name must be different from old campus name' });
    }

    // Check if new campus name already exists
    const existingCampus = await Course.findOne({ 
      campus: newCampusName.trim(), 
      isActive: true 
    });
    
    if (existingCampus) {
      return res.status(400).json({ message: 'A campus with this name already exists' });
    }

    // Bulk update all courses with the old campus name
    const result = await Course.updateMany(
      { campus: oldCampusName, isActive: true },
      { $set: { campus: newCampusName.trim() } }
    );

    res.json({ 
      message: 'Campus renamed successfully',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error renaming campus:', error);
    res.status(500).json({ message: 'Failed to rename campus' });
  }
});

module.exports = router;

