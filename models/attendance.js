// models/attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true // For efficient querying by date
  },
  records: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    status: {
      type: String,
      enum: ["present", "absent", "late"],
      required: true
    },
    notes: {
      type: String,
      default: ""
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });


export default mongoose.model("Attendance", attendanceSchema);