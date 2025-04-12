import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  days: [{
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    slots: [{
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      activity: {
        type: String,
        required: true
      },
      teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User" // References User
      },
      status: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending"
      },
      notes: String
    }]
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

export default mongoose.model("Timetable", timetableSchema);