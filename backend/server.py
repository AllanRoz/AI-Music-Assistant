from flask import Flask, request, jsonify
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from collections import defaultdict
from dotenv import load_dotenv
import os
import time
from google import genai
from google.genai import types

load_dotenv()

CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

sp_client_credentials_manager = SpotifyClientCredentials(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET
)
sp = spotipy.Spotify(auth_manager=sp_client_credentials_manager)

client = genai.Client(api_key=GEMINI_API_KEY)
model_name = "models/gemini-2.5-pro-exp-03-25"  # Using a stable model

def get_gemini_genre_classification_batched(prompt):
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)],
                ),
            ],
            config=types.GenerateContentConfig(response_mime_type="text/plain"),
        )
        if response.text:
            return response.text.strip()
        else:
            return None
    except Exception as e:
        print(f"Error classifying with Gemini (batched): {e}")
        return None

def classify_unknown_genres_batched_gemini(unknown_songs):
    if not unknown_songs:
        return {}

    prompt_header = "Classify the genre for the following songs. Provide the genre for each song in the format 'Song Name - Artist(s): Genre'.\n\n"
    song_artist_pairs = [f"{song['name']} - {song['artists']}" for song in unknown_songs]
    prompt_body = "\n".join(song_artist_pairs)
    prompt_footer = "\n\nGenres:"
    full_prompt = prompt_header + prompt_body + prompt_footer

    classification_response = get_gemini_genre_classification_batched(full_prompt)

    classifications = {}
    if classification_response:
        lines = classification_response.strip().split('\n')
        for line in lines:
            if ': ' in line:
                song_info, genre = line.split(': ', 1)
                classifications[song_info.strip()] = genre.strip()

    return classifications

def get_playlist_id(link):
    try:
        return link.split('/')[-1].split('?')[0]
    except IndexError:
        return None

def get_playlist_tracks(playlist_id):
    tracks = []
    try:
        results = sp.playlist_tracks(playlist_id)
        tracks.extend(results['items'])
        while results['next']:
            results = sp.next(results)
            tracks.extend(results['items'])
        return tracks
    except Exception as e:
        print(f"Error fetching playlist tracks: {e}")
        return None

artist_genre_cache = {}

def get_genre_from_artists(artists):
    for artist in artists:
        artist_id = artist['id']
        if not artist_id:
            continue
        if artist_id in artist_genre_cache:
            genres = artist_genre_cache[artist_id]
        else:
            try:
                artist_data = sp.artist(artist_id)
                time.sleep(0.1)
                genres = artist_data.get('genres', [])
                artist_genre_cache[artist_id] = genres
            except Exception as e:
                print(f"Error fetching artist info: {e}")
                genres = []
        if genres:
            return genres[0]
    return 'Unknown'

def organize_by_genre(tracks):
    genre_map = defaultdict(list)
    unknown_songs = []
    if tracks:
        for item in tracks:
            track = item['track']
            if not track:
                continue
            name = track['name']
            artists = track['artists']
            artist_names_str = ', '.join(artist['name'] for artist in artists)
            genre = get_genre_from_artists(artists)
            if genre == 'Unknown':
                unknown_songs.append({'name': name, 'artists': artist_names_str})
            else:
                genre_map[genre].append(f"{name} - {artist_names_str}")

        print("\nClassifying songs with 'Unknown' genre using Gemini...")
        gemini_classifications = classify_unknown_genres_batched_gemini(unknown_songs)

        for song in unknown_songs:
            song_artist_str = f"{song['name']} - {song['artists']}"
            if song_artist_str in gemini_classifications:
                classified_genre = gemini_classifications[song_artist_str]
                print(f"Gemini classified '{song_artist_str}' as '{classified_genre}'")
                genre_map[classified_genre].append(song_artist_str)
            else:
                genre_map['Unknown (Unclassified by Gemini)'].append(song_artist_str)
    return list(genre_map.items())

app = Flask(__name__)

@app.route("/organize/playlist", methods=['POST'])
def organize_playlist_endpoint():
    data = request.get_json()
    playlist_link = data.get('link')
    if not playlist_link:
        return jsonify({"error": "Missing 'link' in request body"}), 400

    playlist_id = get_playlist_id(playlist_link)
    if not playlist_id:
        return jsonify({"error": "Invalid Spotify playlist link"}), 400

    tracks = get_playlist_tracks(playlist_id)
    if tracks is None:
        return jsonify({"error": "Could not retrieve playlist tracks"}), 500

    organized_songs = organize_by_genre(tracks)
    return jsonify(organized_songs)

@app.route("/organize/text", methods=['POST'])
def organize_text_endpoint():
    data = request.get_json()
    text_input = data.get('text')
    if not text_input:
        return jsonify({"error": "Missing 'text' in request body"}), 400

    # Split the text into potential song entries (you might need more sophisticated logic)
    potential_songs = [line.strip() for line in text_input.split('\n') if line.strip()]
    unknown_songs = []
    for song_info in potential_songs:
        # Try to split into name and artist - this is a basic approach
        parts = song_info.split(' - ')
        if len(parts) == 2:
            unknown_songs.append({'name': parts[0].strip(), 'artists': parts[1].strip()})
        else:
            unknown_songs.append({'name': song_info.strip(), 'artists': ''}) # Or handle differently

    gemini_classifications = classify_unknown_genres_batched_gemini(unknown_songs)
    genre_map = defaultdict(list)
    for song in unknown_songs:
        song_artist_str = f"{song['name']} - {song['artists']}".strip(' -')
        if song_artist_str in gemini_classifications:
            classified_genre = gemini_classifications[song_artist_str]
            genre_map[classified_genre].append(song_artist_str)
        else:
            genre_map['Unknown (Text Input)'].append(song_artist_str)

    return jsonify(list(genre_map.items()))

if __name__ == "__main__":
    app.run(debug=True)