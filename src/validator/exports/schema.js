const Joi = require("joi");

const ExportPlaylistsPayloadSchema = Joi.object({
  targetEmail: Joi.string().email().required(),
});

module.exports = ExportPlaylistsPayloadSchema;
