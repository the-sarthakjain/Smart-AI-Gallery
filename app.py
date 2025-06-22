from flask import Flask, request, jsonify, render_template, send_from_directory
from search import get_image_paths, compute_image_embeddings, search_by_text
import os
import shutil

app = Flask(__name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UNSORTED_FOLDER = os.path.join(BASE_DIR, "static", "images", "unsorted")
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

image_paths = []
image_embeddings = []

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def refresh_embeddings():
    global image_paths, image_embeddings
    image_paths = get_image_paths(UNSORTED_FOLDER)
    print(f"📸 Found {len(image_paths)} images.")
    image_embeddings = compute_image_embeddings(image_paths)
    print("✅ Embeddings updated.")

refresh_embeddings()

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/api/search", methods=["POST"])
def search_images():
    data = request.get_json()
    query = data.get("query", "")
    album = data.get("album", None)

    if not query:
        return jsonify({"error": "No query provided"}), 400

    target_paths = get_image_paths(os.path.join(UNSORTED_FOLDER, album)) if album else image_paths
    target_embeddings = compute_image_embeddings(target_paths)

    results = search_by_text(query, target_embeddings, top_k=5)
    image_urls = ["/" + os.path.relpath(path, BASE_DIR).replace("\\", "/") for path, _ in results]
    return jsonify({"results": image_urls})

@app.route("/api/upload", methods=["POST"])
def upload_album():
    if 'images' not in request.files:
        return jsonify({"error": "No files uploaded"}), 400

    files = request.files.getlist("images")
    album_name = request.form.get("folder", "album")
    album_path = os.path.join(UNSORTED_FOLDER, album_name)
    os.makedirs(album_path, exist_ok=True)

    uploaded = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = os.path.basename(file.filename)
            file_path = os.path.join(album_path, filename)
            file.save(file_path)
            uploaded.append(filename)

    refresh_embeddings()
    return jsonify({"message": f"Uploaded {len(uploaded)} files.", "uploaded": uploaded})

@app.route("/api/albums", methods=["GET"])
def list_albums():
    if not os.path.exists(UNSORTED_FOLDER):
        return jsonify({"albums": []})
    albums = [d for d in os.listdir(UNSORTED_FOLDER) if os.path.isdir(os.path.join(UNSORTED_FOLDER, d))]
    return jsonify({"albums": albums})

@app.route("/api/album_images/<album_name>", methods=["GET"])
def get_album_images(album_name):
    album_path = os.path.join(UNSORTED_FOLDER, album_name)
    if not os.path.exists(album_path):
        return jsonify({"images": [], "subfolders": []})
    
    images = [f"/static/images/unsorted/{album_name}/{img}"
              for img in os.listdir(album_path)
              if allowed_file(img)]

    # If no images found, check for subfolders (e.g., food, nature)
    if not images:
        subfolders = [
            name for name in os.listdir(album_path)
            if os.path.isdir(os.path.join(album_path, name))
        ]
        return jsonify({"images": [], "subfolders": subfolders})

    return jsonify({"images": images, "subfolders": []})


@app.route("/api/delete_album", methods=["POST"])
def delete_album():
    data = request.get_json()
    album = data.get("album")
    album_path = os.path.join(UNSORTED_FOLDER, album)
    if not album or not os.path.exists(album_path):
        return jsonify({"error": "Album not found"}), 404
    shutil.rmtree(album_path)
    refresh_embeddings()
    return jsonify({"status": f"Album '{album}' deleted successfully."})

@app.route("/api/rename_album", methods=["POST"])
def rename_album():
    data = request.get_json()
    old_name = data.get("old_name")
    new_name = data.get("new_name")

    old_path = os.path.join(UNSORTED_FOLDER, old_name)
    new_path = os.path.join(UNSORTED_FOLDER, new_name)

    if not os.path.exists(old_path):
        return jsonify({"error": "Original album not found"}), 404

    if os.path.exists(new_path):
        return jsonify({"error": "Album with new name already exists"}), 400

    os.rename(old_path, new_path)
    refresh_embeddings()
    return jsonify({"message": f"Album renamed to '{new_name}'."})

@app.route('/static/images/unsorted/<path:filename>')
def serve_unsorted_image(filename):
    return send_from_directory(UNSORTED_FOLDER, filename)

@app.route("/api/sort_album", methods=["POST"])
def sort_album():
    data = request.get_json()
    album_name = data.get("album")
    album_path = os.path.join(UNSORTED_FOLDER, album_name)

    if not os.path.exists(album_path):
        return jsonify({"error": "Album not found"}), 404

    sorted_output_path = os.path.join(UNSORTED_FOLDER, "sorted_ai")
    if os.path.exists(sorted_output_path):
        shutil.rmtree(sorted_output_path)

    from sort import sort_images
    sort_images(album_path, sorted_output_path)
    refresh_embeddings()

    return jsonify({"success": True, "folder_name": "sorted_ai"})


@app.route("/api/album_images/<album_name>/<subfolder>", methods=["GET"])
def get_subfolder_images(album_name, subfolder):
    folder_path = os.path.join(UNSORTED_FOLDER, album_name, subfolder)
    if not os.path.exists(folder_path):
        return jsonify({"images": []})
    images = [
        f"/static/images/unsorted/{album_name}/{subfolder}/{img}"
        for img in os.listdir(folder_path) if allowed_file(img)
    ]
    return jsonify({"images": images})


if __name__ == "__main__":
    app.run(debug=True)