const Joi = require('joi');

const PlaylistSchema = Joi.object({
  name: Joi.string().required(),
});

const SongIdSchema = Joi.object({
  songId: Joi.string().required(),
});

module.exports = { PlaylistSchema, SongIdSchema };
