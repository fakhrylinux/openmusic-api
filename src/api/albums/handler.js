const autoBind = require('auto-bind');

class AlbumsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;
    const albumId = await this._service.addAlbum({ name, year });

    return h.response({
      status: 'success',
      message: 'Album added successfully',
      data: {
        albumId,
      },
    }).code(201);
  }

  async getAlbumsHandler() {
    const albums = await this._service.getAlbums();
    return {
      status: 'success',
      data: {
        albums,
      },
    };
  }

  async getAlbumByIdHandler(request) {
    const { id } = request.params;
    const album = await this._service.getAlbumById(id);
    return {
      status: 'success',
      data: {
        album,
      },
    };
  }

  async putAlbumByIdHandler(request) {
    this._validator.validateAlbumPayload(request.payload);
    const { id } = request.params;
    this._validator.validateAlbumId(id);

    await this._service.editAlbumById(id, request.payload);

    return {
      status: 'success',
      message: 'Album updated successfully',
    };
  }

  async deleteAlbumByIdHandler(request) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);
    return {
      status: 'success',
      message: 'Album deleted successfully',
    };
  }

  async postLikeToAlbumHandler(request, h) {
    const { id: userId } = request.auth.credentials;
    const { id: albumId } = request.params;
    await this._service.getAlbumById(albumId);
    await this._service.addLikeAlbum(userId, albumId);

    return h.response({
      status: 'success',
      message: 'Like album success',
    }).code(201);
  }

  async deleteLikeFromAlbumHandler(request) {
    const { id: userId } = request.auth.credentials;
    const { id: albumId } = request.params;
    await this._service.deleteLikeAlbum(userId, albumId);

    return {
      status: 'success',
      message: 'Dislike album success',
    };
  }

  async getLikesCountFromAlbumHandler(request) {
    const { id: albumId } = request.params;
    const result = await this._service.getLikesCount(albumId);

    return {
      status: 'success',
      data: result,
    };
  }
}

module.exports = AlbumsHandler;
