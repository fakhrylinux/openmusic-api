const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const { mapPlaylistDBToModel } = require('../../utils');

class PlaylistsService {
  constructor(collaborationService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
  }

  async addPlaylist(name, owner) {
    const id = `playlist-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, name, owner, createdAt, createdAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Failed to add playlist');
    }

    return result.rows[0].id;
  }

  async getPlaylists(username) {
    const query = {
      text: 'SELECT * FROM playlists WHERE username = $1',
      values: [username],
    };
    const result = await this._pool.query(query);

    return result.rows.map(mapPlaylistDBToModel);
  }

  async deletePlaylistById(id) {
    // Delete the junction table playlist_songs first
    const query1 = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1',
      values: [id],
    };
    await this._pool.query(query1);

    // Then delete the playlist record
    const query2 = {
      text: 'DELETE FROM playlists WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query2);
    if (!result.rowCount) {
      throw new NotFoundError('Failed to delete playlist. ID not found');
    }
  }

  async addSongToPlaylist(playlistId, songId) {
    const id = nanoid(16);

    const query = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Failed to add song to playlist');
    }

    return result.rows[0].id;
  }

  async getPlaylistById(id) {
    const query = {
      text: 'SELECT id, name FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Album not found');
    }

    return {
      ...result.rows[0],
    };
  }

  async getSongsFromPlaylist(playlistId) {
    const songsQuery = {
      text: `SELECT songs.id, songs.title, songs.performer FROM songs 
      INNER JOIN playlist_songs on songs.id = playlist_songs.song_id 
      INNER JOIN playlists on playlists.id = playlist_songs.playlist_id 
      WHERE playlists.id = $1`,
      values: [playlistId],
    };
    const result = await this._pool.query(songsQuery);
    return result.rows;
  }

  async deleteSongFromPlaylist(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Failed to delete song. ID not found');
    }
  }

  async verifyPlaylistOwner(playlistId, username) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Playlist not found');
    }
    const playlist = result.rows[0];
    if (playlist.username !== username) {
      throw new AuthorizationError('You are not authorized to access this resource');
    }
  }

  async verifyPlaylistAccess(playlistId, username) {
    try {
      await this.verifyPlaylistOwner(playlistId, username);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationService.verifyCollaborator(playlistId, username);
      } catch {
        throw error;
      }
    }
  }
}

module.exports = PlaylistsService;
