const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");
const ClientError = require("../../exceptions/ClientError");

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO albums VALUES($1, $2, $3) RETURNING id",
      values: [id, name, year],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError("Album gagal ditambahkan");
    }

    return result.rows[0].id;
  }

  async getAlbumById(id) {
    const query = {
      text: 'SELECT id, name, year, cover as "coverUrl" FROM albums WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const album = result.rows[0];

    const songQuery = {
      text: 'SELECT id, title, performer FROM songs WHERE "albumId" = $1 OR album_id = $1',
      values: [id],
    };
    const songResult = await this._pool.query(songQuery);

    album.songs = songResult.rows;

    return album;
  }

  async editAlbumById(id, { name, year }) {
    const query = {
      text: "UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id",
      values: [name, year, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui album. Id tidak ditemukan");
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: "DELETE FROM albums WHERE id = $1 RETURNING id",
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Album gagal dihapus. Id tidak ditemukan");
    }
  }

  async addAlbumCover(id, cover) {
    const query = {
      text: "UPDATE albums SET cover = $1 WHERE id = $2 RETURNING id",
      values: [cover, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Gagal menambahkan cover. Id tidak ditemukan");
    }
  }

  async addAlbumLike(userId, albumId) {
    const albumQuery = {
      text: "SELECT id FROM albums WHERE id = $1",
      values: [albumId],
    };
    const albumResult = await this._pool.query(albumQuery);
    if (!albumResult.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const checkQuery = {
      text: "SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2",
      values: [userId, albumId],
    };
    const checkResult = await this._pool.query(checkQuery);
    if (checkResult.rows.length) {
      throw new ClientError("Anda sudah menyukai album ini", 400);
    }

    const id = `like-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id",
      values: [id, userId, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError("Gagal menyukai album");
    }

    await this._cacheService.delete(`likes:${albumId}`);
  }

  async deleteAlbumLike(userId, albumId) {
    const query = {
      text: "DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id",
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError(
        "Gagal batal menyukai album. Anda belum menyukai album ini",
      );
    }

    await this._cacheService.delete(`likes:${albumId}`);
  }

  async getAlbumLikes(albumId) {
    try {
      const result = await this._cacheService.get(`likes:${albumId}`);
      return {
        likes: parseInt(result),
        source: "cache",
      };
    } catch (error) {
      const query = {
        text: "SELECT COUNT(*) FROM user_album_likes WHERE album_id = $1",
        values: [albumId],
      };
      const result = await this._pool.query(query);
      const likes = parseInt(result.rows[0].count);

      await this._cacheService.set(`likes:${albumId}`, JSON.stringify(likes));

      return {
        likes,
        source: "database",
      };
    }
  }
}

module.exports = AlbumsService;
