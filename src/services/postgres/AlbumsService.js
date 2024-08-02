const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const { mapAlbumDBToModel, mapSongDBToModel } = require('../../utils');

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const query = {
      text: 'INSERT INTO albums VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, name, year, createdAt, createdAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Failed to add album');
    }

    return result.rows[0].id;
  }

  async addCoverToAlbum(albumId, cover) {
    const query = {
      text: 'UPDATE albums SET cover = $1 WHERE id = $2 RETURNING id',
      values: [cover, albumId],
    };
    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Album not found');
    }
  }

  async getAlbums() {
    return this._pool.query('SELECT * FROM albums');
  }

  async getAlbumById(id) {
    const query = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [id],
    };
    const songsQuery = {
      text: 'SELECT * FROM songs WHERE album_id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);
    const songsResult = await this._pool.query(songsQuery);

    if (!result.rowCount) {
      throw new NotFoundError('Album not found');
    }

    return {
      ...result.rows.map(mapAlbumDBToModel)[0],
      songs: songsResult.rows.map(mapSongDBToModel),
    };
  }

  async editAlbumById(id, { name, year }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: 'UPDATE albums SET name = $1, year = $2, updated_at = $3 WHERE id = $4 RETURNING id',
      values: [name, year, updatedAt, id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Failed to update album. ID not found');
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Failed to delete album. ID not found');
    }

    await this._cacheService.delete(`albums:${id}`);
  }

  async addLikeAlbum(userId, albumId) {
    try {
      const id = nanoid(16);
      const query = {
        text: 'INSERT INTO user_album_likes values($1, $2, $3) RETURNING id',
        values: [id, userId, albumId],
      };

      const result = await this._pool.query(query);
      return result.rows[0].id;
    } catch (error) {
      throw new InvariantError('Cannot like album twice');
    }
  }

  async deleteLikeAlbum(userId, albumId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Album not found');
    }

    await this._cacheService.delete(`albums:${albumId}`);
  }

  async getLikesCount(albumId) {
    try {
      const result = JSON.parse(await this._cacheService.get(`albums:${albumId}`));

      return {
        isCache: true,
        result,
      };
    } catch (error) {
      const query = {
        text: 'SELECT COUNT(*)::INTEGER AS likes FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      };

      const resultRow = await this._pool.query(query);

      if (!resultRow.rowCount) {
        throw new NotFoundError('Album not found');
      }

      const result = resultRow.rows[0];
      await this._cacheService.set(`albums:${albumId}`, JSON.stringify(result));

      return {
        isCache: false,
        result,
      };
    }
  }
}

module.exports = AlbumsService;
