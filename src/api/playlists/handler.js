const autoBind = require('auto-bind');

class PlaylistsHandler {
  constructor(playlistsService, songsService, validator) {
    this._playlistsService = playlistsService;
    this._songsService = songsService;
    this._validator = validator;

    autoBind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);
    const { id: ownerId } = request.auth.credentials;
    const { name } = request.payload;

    const playlistId = await this._playlistsService.addPlaylist(name, ownerId);

    return h.response({
      status: 'success',
      message: 'Playlist added successfully',
      data: {
        playlistId,
      },
    }).code(201);
  }

  async getPlaylistsHandler(request, h) {
    const { id: userId } = request.auth.credentials;
    const playlists = await this._playlistsService.getPlaylists(userId);

    if (playlists.isCache) {
      return h.response({
        status: 'success',
        data: {
          playlists: playlists.result,
        },
      }).header('X-Data-Source', 'cache');
    }

    return h.response({
      status: 'success',
      data: {
        playlists: playlists.result,
      },
    }).header('X-Data-Source', 'no-cache');
  }

  async deletePlaylistHandler(request) {
    const { id: playlistId } = request.params;
    const { id: ownerId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistOwner(playlistId, ownerId);
    await this._playlistsService.deletePlaylistById(playlistId);

    return {
      status: 'success',
      message: 'Playlist deleted successfully',
    };
  }

  async postSongToPlaylistHandler(request, h) {
    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    this._validator.validateSongId({ songId });
    const { id: credentialId } = request.auth.credentials;
    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    await this._songsService.getSongById(songId);
    await this._playlistsService.addSongToPlaylist(playlistId, songId, credentialId);

    return h.response({
      status: 'success',
      message: 'The song has been successfully added to the playlist',
    }).code(201);
  }

  async getSongsFromPlaylistHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const { id: playlistId } = request.params;
    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    const playlist = await this._playlistsService.getPlaylistById(playlistId);
    const songs = await this._playlistsService.getSongsFromPlaylist(playlistId);

    return {
      status: 'success',
      data: {
        playlist: {
          ...playlist,
          songs,
        },
      },
    };
  }

  async deleteSongFromPlaylistHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    await this._validator.validateSongId({ songId });

    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);
    await this._playlistsService.deleteSongFromPlaylist(playlistId, songId, credentialId);

    return {
      status: 'success',
      message: 'The song has been successfully removed from the playlist',
    };
  }

  async getActivitiesHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const { id: playlistId } = request.params;
    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    const activities = await this._playlistsService.getActivities(playlistId, credentialId);

    return {
      status: 'success',
      data: {
        playlistId,
        activities,
      },
    };
  }
}

module.exports = PlaylistsHandler;
