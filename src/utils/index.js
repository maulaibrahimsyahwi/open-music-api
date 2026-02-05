const mapDBToModelAlbum = ({ id, name, year }) => ({
  id,
  name,
  year,
});

const mapDBToModelSong = ({
  id,
  title,
  year,
  performer,
  genre,
  duration,
  album_id,
}) => ({
  id,
  title,
  year,
  performer,
  genre,
  duration,
  albumId: album_id,
});

module.exports = { mapDBToModelAlbum, mapDBToModelSong };
