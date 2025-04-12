import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from collections import defaultdict
from dotenv import load_dotenv
import os
import time
import google.generativeai as genai

load_dotenv()

CLIENT_ID = os.getenv('CLIENT_ID'),
CLIENT_SECRET = os.getenv('CLIENT_SECRET')

PLAYLIST_LINK = os.getenv('SPOTIFY_PLAYLIST_LINK')

sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=os.getenv('CLIENT_ID'),
    client_secret=os.getenv('CLIENT_SECRET')
))

# genai.configure(api_key="YOUR_API_KEY")

# model = genai.GenerativeModel('gemini-pro')

def get_playlist_id(link):
    return link.split('/')[-1].split('?')[0]

def get_playlist_tracks(playlist_id):
    tracks = []
    results = sp.playlist_tracks(playlist_id)
    tracks.extend(results['items'])

    while results['next']:
        results = sp.next(results)
        tracks.extend(results['items'])

    return tracks

artist_genre_cache = {}

def get_genre_from_artists(artists):
    for artist in artists:
        artist_id = artist['id']
        if not artist_id:
            continue

        if artist_id in artist_genre_cache:
            genres = artist_genre_cache[artist_id]
        else:
            artist_data = sp.artist(artist_id)
            time.sleep(0.1) 
            genres = artist_data['genres']
            artist_genre_cache[artist_id] = genres 

        if genres:
            return genres[0]
    return 'Unknown'


def organize_by_genre(tracks):
    genre_map = defaultdict(list)

    for item in tracks:
        track = item['track']
        name = track['name']
        artists = track['artists']
        genre = get_genre_from_artists(artists)

        artist_names = ', '.join(artist['name'] for artist in artists)
        genre_map[genre].append(f"{name} - {artist_names}")

    return genre_map


playlist_id = get_playlist_id(PLAYLIST_LINK)
tracks = get_playlist_tracks(playlist_id)
genre_map = organize_by_genre(tracks)

with open("organized_playlist.txt", "w", encoding="utf-8") as f:
    for genre, songs in genre_map.items():
        f.write(f"\n## {genre.upper()} ##\n")
        for song in songs:
            f.write(f"{song}\n")


print("✅ Playlist organized by genre and saved to 'organized_playlist.txt'")
