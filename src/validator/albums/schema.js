const Joi = require('joi');

const AlbumPayloadSchema = Joi.object({
  name: Joi.string().required(),
  year: Joi.number().required(),
});

const AlbumIdSchema = Joi.string();

module.exports = { AlbumIdSchema, AlbumPayloadSchema };
