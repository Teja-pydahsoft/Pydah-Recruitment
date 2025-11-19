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

module.exports = router;

