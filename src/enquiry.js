const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 10 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    pincode: { type: String, required: true, trim: true, maxlength: 6 },
    comments: { type: String, trim: true, maxlength: 1000, default: '' },
    pageUrl: { type: String, trim: true, maxlength: 500, default: '' }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

enquirySchema.index({ createdAt: -1 });

function presentEnquiry(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    pincode: doc.pincode,
    comments: doc.comments || '',
    pageUrl: doc.pageUrl || '',
    createdAt: doc.createdAt
  };
}

const Enquiry = mongoose.model('Enquiry', enquirySchema);

module.exports = { Enquiry, presentEnquiry };
