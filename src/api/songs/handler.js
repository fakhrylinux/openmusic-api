const autoBind = require('auto-bind');

class SongsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postSongHandler(request, h) {
    this._validator.validateSongPayload(request.payload);
    const {
      title, year, genre, performer, duration = null, albumId = null,
    } = request.payload;

    const songId = await this._service.addSong({
      title, year, genre, performer, duration, albumId,
    });

    return h.response({
      status: 'success',
      message: 'Song added successfully',
      data: {
        songId,
      },
    }).code(201);
  }

  async getSongsHandler(request) {
    const { title, performer } = request.query;
    await this._validator.validateSongQuery({ title, performer });

    const songs = await this._service.getSongs();
    let filteredSongs = songs;
    const filteredByTitle = (song) => song.title.toLowerCase()
      .includes(title.toLowerCase());
    const filteredByPerformer = (song) => song.performer.toLowerCase()
      .includes(performer.toLowerCase());

    if (title && performer) {
      filteredSongs = songs.filter(filteredByTitle).filter(filteredByPerformer);
    }

    if (title) {
      filteredSongs = songs.filter(filteredByTitle);
    }

    if (performer) {
      filteredSongs = songs.filter(filteredByPerformer);
    }

    return {
      status: 'success',
      data: {
        songs: filteredSongs,
      },
    };
  }

  async getSongByIdHandler(request) {
    const { id } = request.params;
    const song = await this._service.getSongById(id);
    return {
      status: 'success',
      data: {
        song,
      },
    };
  }

  async putSongByIdHandler(request) {
    this._validator.validateSongPayload(request.payload);
    const { id } = request.params;
    this._validator.validateSongId(id);

    await this._service.editSongById(id, request.payload);

    return {
      status: 'success',
      message: 'Song updated successfully',
    };
  }

  async deleteSongByIdHandler(request) {
    const { id } = request.params;
    await this._service.deleteSongById(id);
    return {
      status: 'success',
      message: 'Song deleted successfully',
    };
  }
}

module.exports = SongsHandler;
