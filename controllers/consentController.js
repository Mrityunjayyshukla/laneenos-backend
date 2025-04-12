import Consent from "../models/consent.js";
import ConsentResponse from "../models/consentResponse.js";
import Student from "../models/student.js";
import User from "../models/user.js";
import parentModel from "../models/parent.js";

export const createConsentRequest = async (req, res) => {
  try {
    const { title, description, sessionId, classId } = req.body;

    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ message: "Unauthorized" });
    // }

    if (!title || !description || !sessionId || !classId) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const consent = new Consent({
      title,
      description,
      sessionId,
      classId
    });
    const savedConsent = await consent.save();

    // Find all active students in the class
    const students = await Student.find({ 
      classId, 
      sessionId,
      status: "active"
    }).lean();

    if (!students.length) {
      return res.status(404).json({ 
        message: "No active students found for this class and session" 
      });
    }

    // Create consent responses for both parents of each student
    const consentResponses = await Promise.all(
      students.map(async (student) => {
        try {
          const fatherEmail = student.fatherInfo?.email;
          const motherEmail = student.motherInfo?.email;

          const father = fatherEmail 
            ? await User.findOne({ email: fatherEmail, role: "parent", status: "active" })
            : null;

          const mother = motherEmail 
            ? await User.findOne({ email: motherEmail, role: "parent", status: "active" })
            : null;

          if (!father && fatherEmail) {
            const parentData = await parentModel.findOne({ fatherEmail });
            if (parentData) {
              const newFather = await User.findOneAndUpdate(
                { email: parentData.fatherEmail },
                {
                  role: "parent",
                  name: parentData.fatherName || "Father",
                  email: parentData.fatherEmail,
                  phone: parentData.fatherMobile,
                  status: "active",
                  password: "password"
                },
                { upsert: true, new: true }
              );
              if (newFather) return newFather;
            }
          }

          if (!mother && motherEmail) {
            const parentData = await parentModel.findOne({ fatherEmail: motherEmail });
            if (parentData) {
              const newMother = await User.findOneAndUpdate(
                { email: motherEmail },
                {
                  role: "parent",
                  name: parentData.motherName || "Mother",
                  email: motherEmail,
                  phone: parentData.motherNumber || parentData.fatherMobile,
                  status: "active",
                  password: "password"
                },
                { upsert: true, new: true }
              );
              if (newMother) return newMother;
            }
          }

          const responses = [];
          if (father) {
            responses.push(new ConsentResponse({
              consentId: savedConsent._id,
              studentId: student._id,
              parentId: father._id,
              status: "pending"
            }).save());
          }

          if (mother && motherEmail !== fatherEmail) {
            responses.push(new ConsentResponse({
              consentId: savedConsent._id,
              studentId: student._id,
              parentId: mother._id,
              status: "pending"
            }).save());
          }

          return responses.length ? Promise.all(responses) : null;
        } catch (error) {
          console.error(`Error processing student ${student._id}:`, error);
          return null;
        }
      })
    );

    const successfulResponses = consentResponses.flat().filter(Boolean);

    res.status(201).json({ 
      message: "Consent request created successfully",
      consentId: savedConsent._id,
      responseCount: successfulResponses.length
    });
  } catch (error) {
    console.error("Create consent error:", error);
    res.status(500).json({ message: "Server error while creating consent" });
  }
};

export const getParentConsents = async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const responses = await ConsentResponse.find({ parentId: req.user.userId })
      .populate({
        path: "consentId",
        select: "title description sessionId classId"
      })
      .populate({
        path: "studentId",
        select: "name classId admissionNumber",
        match: { status: "active" }
      })
      .lean();

    const validResponses = responses.filter(response => response.studentId !== null);

    res.status(200).json(validResponses);
  } catch (error) {
    console.error("Get consents error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const respondToConsent = async (req, res) => {
  try {
    const { consentResponseId, status } = req.body;
    console.log("Request body:", req.body);
    console.log("Authenticated user:", req.user);

    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!consentResponseId || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }

    const response = await ConsentResponse.findOne({
      _id: consentResponseId,
      parentId: req.user.userId
    });

    if (!response) {
      console.log(`No response found for consentResponseId: ${consentResponseId}, parentId: ${req.user.userId}`);
      const allResponses = await ConsentResponse.find({ _id: consentResponseId });
      console.log("All responses with this ID:", allResponses);
      return res.status(404).json({ message: "Consent response not found" });
    }

    if (response.status !== "pending") {
      return res.status(400).json({ message: "Consent already responded" });
    }

    const existingResponse = await ConsentResponse.findOne({
      consentId: response.consentId,
      studentId: response.studentId,
      status: { $ne: "pending" }
    });

    if (existingResponse) {
      return res.status(400).json({ message: "Another parent has already responded for this student" });
    }

    const updateResult = await ConsentResponse.updateMany(
      { 
        consentId: response.consentId, 
        studentId: response.studentId, 
        status: "pending" 
      },
      { 
        status: status,
        responseDate: new Date(),
        respondedBy: req.user.userId
      }
    );

    res.status(200).json({ 
      message: `Consent ${status} successfully`,
      updatedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error("Respond consent error:", error);
    res.status(500).json({ message: error.message });
  }
};