const { AlbumIdSchema, AlbumPayloadSchema } = require('./schema');
const InvariantError = require('../../exceptions/InvarlantError');
const NotFoundError = require('../../exceptions/NotFoundError');

const AlbumsValidator = {
  validateAlbumPayload: (payload) => {
    const validationResult = AlbumPayloadSchema.validate(payload);
    if (validationResult.error) {
      throw new InvariantError(validationResult.error.message);
    }
  },
  validateAlbumId: (id) => {
    const validationResult = AlbumIdSchema.validate(id);
    if (validationResult.error) {
      throw new NotFoundError(validationResult.error.message);
    }
  },
};

module.exports = AlbumsValidator;
