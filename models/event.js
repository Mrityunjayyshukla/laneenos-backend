import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  eventFor: {
    type: String,
    enum: ['All', 'Students', 'Staffs'],
    required: true,
  },
  eventTitle: {
    type: String,
    required: true,
  },
  eventCategory: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  message:{
    type: String,
    required: true
  },
  attachment: {
    fileName: {
      type: String,
    },
    filePath: {
      type: String,
    },
    fileSize: {
      type: Number,
      max: 4 * 1024 * 1024,
    },
    fileFormat: {
      type: String,
      enum: ['pdf'], 
    },
  },
});

eventSchema.pre('save', function (next) {
  if (this.startDate && typeof this.startDate === 'string') {
    this.startDate = new Date(this.startDate);
  }
  if (this.endDate && typeof this.endDate === 'string') {
    this.endDate = new Date(this.endDate);
  }
  next();
});
const Event = mongoose.model('Event', eventSchema);

export default Event;