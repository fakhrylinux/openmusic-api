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
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists
      INNER JOIN users ON playlists.username = users.id
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      WHERE playlists.username = $1 OR collaborations.user_id = $1
      GROUP BY playlists.id, users.username`,
      values: [username],
    };
    const result = await this._pool.query(query);

    return result.rows.map(mapPlaylistDBToModel);
  }

  async deletePlaylistById(id) {
    const query1 = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1',
      values: [id],
    };
    await this._pool.query(query1);

    const query2 = {
      text: 'DELETE FROM playlists WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query2);
    if (!result.rowCount) {
      throw new NotFoundError('Failed to delete playlist. ID not found');
    }
  }

  async addSongToPlaylist(playlistId, songId, userId) {
    const id = nanoid(16);

    const query = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Failed to add song to playlist');
    }

    await this.updateActivitiesTable(playlistId, songId, userId, 'add');

    return result.rows[0].id;
  }

  async getPlaylistById(id) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists 
      INNER JOIN users ON playlists.username = users.id
      WHERE playlists.id = $1`,
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Playlist not found');
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

  async deleteSongFromPlaylist(playlistId, songId, userId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Failed to delete song. ID not found');
    }

    await this.updateActivitiesTable(playlistId, songId, userId, 'delete');
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
      console.log(username);
      console.log(playlist.username);
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

  async getActivities(playlistId, userId) {
    const query = {
      text: `SELECT users.username, songs.title, playlist_song_activities.action, playlist_song_activities.time
      FROM playlist_song_activities
      INNER JOIN users ON users.id = playlist_song_activities.user_id
      INNER JOIN songs ON songs.id = playlist_song_activities.song_id
      WHERE playlist_song_activities.playlist_id = $1
      AND playlist_song_activities.user_id = $2`,
      values: [playlistId, userId],
    };
    const result = await this._pool.query(query);

    return result.rows;
  }

  async updateActivitiesTable(playlistId, songId, userId, action) {
    const activityId = nanoid(16);
    const time = new Date().toISOString();
    const activityQuery = {
      text: 'INSERT INTO playlist_song_activities VALUES($1, $2, $3, $4,  $5, $6)',
      values: [activityId, playlistId, songId, userId, action, time],
    };
    await this._pool.query(activityQuery);
  }
}

module.exports = PlaylistsService;
