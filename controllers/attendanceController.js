// controllers/attendanceController.js
import Attendance from "../models/attendance.js";
import Class from "../models/class.js";
import Student from "../models/student.js";

// Add or update daily attendance for all students in a class
export const addAttendance = async (req, res) => {
  try {
    const { classId, date, records } = req.body;
    const userId = req.user.userId; // Teacher's User._id from token

    // Validate input
    if (!classId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: "Class ID, date, and records array are required" });
    }

    // Check if class exists and teacher is authorized
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }
    if (req.user.role === "teacher" && !classData.teacherId.some(id => id.toString() === userId)) {
      return res.status(403).json({ message: "You are not authorized to manage this class's attendance" });
    }

    // Fetch all students in the class
    const students = await Student.find({ classId }).select("_id");
    const studentIds = students.map(student => student._id.toString());

    // Validate records: Ensure all students are included and no extras
    const providedStudentIds = records.map(record => record.studentId.toString());
    if (providedStudentIds.length !== studentIds.length ||
        !studentIds.every(id => providedStudentIds.includes(id)) ||
        !providedStudentIds.every(id => studentIds.includes(id))) {
      return res.status(400).json({ message: "Records must include all and only students in the class" });
    }

    // Check for valid status values
    const validStatuses = ["present", "absent", "late"];
    for (const record of records) {
      if (!validStatuses.includes(record.status)) {
        return res.status(400).json({ message: `Invalid status: ${record.status}. Must be 'present', 'absent', or 'late'` });
      }
    }

    // Check for existing attendance record
    const existingAttendance = await Attendance.findOne({
      classId,
      date: new Date(date)
    });

    let attendance;
    if (existingAttendance) {
      // Update existing record
      existingAttendance.records = records;
      existingAttendance.createdBy = userId; // Update creator in case it's reassigned
      attendance = await existingAttendance.save();
    } else {
      // Create new record
      attendance = new Attendance({
        classId,
        date: new Date(date),
        records,
        createdBy: userId
      });
      await attendance.save();
    }

    res.status(200).json({ message: "Attendance recorded successfully", attendance });
  } catch (error) {
    console.error("Error adding attendance:", error.message);
    res.status(500).json({ message: error.message });
  }
};