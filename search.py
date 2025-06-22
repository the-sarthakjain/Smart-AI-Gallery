import os
import torch
import clip
from PIL import Image
import cv2

# Load the CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

IMAGE_FOLDER = "C:/Users/Sarthak Jain/Desktop/final smaart gallery/static/images/unsorted"
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

def get_image_paths(folder):
    return [os.path.join(folder, f) for f in os.listdir(folder)
            if f.split('.')[-1].lower() in ALLOWED_EXTENSIONS]

def compute_image_embeddings(image_paths):
    embeddings = []
    for path in image_paths:
        image = preprocess(Image.open(path)).unsqueeze(0).to(device)
        with torch.no_grad():
            image_features = model.encode_image(image)
            image_features /= image_features.norm(dim=-1, keepdim=True)
        embeddings.append((path, image_features))
    return embeddings

def search_by_text(query, image_embeddings, top_k=5, min_score=0.21):
    text = clip.tokenize([query]).to(device)
    with torch.no_grad():
        text_features = model.encode_text(text)
        text_features /= text_features.norm(dim=-1, keepdim=True)

    results = []
    for path, img_feat in image_embeddings:
        similarity = (img_feat @ text_features.T).item()
        if similarity >= min_score:
            results.append((path, similarity))

    # Sort by similarity
    results.sort(key=lambda x: x[1], reverse=True)
    return results[:top_k]


if __name__ == "__main__":
    print("🔍 Semantic Image Search with CLIP")
    image_paths = get_image_paths(IMAGE_FOLDER)
    print(f"Found {len(image_paths)} images in '{IMAGE_FOLDER}'")

    image_embeddings = compute_image_embeddings(image_paths)

    while True:
        query = input("\nEnter search query (or 'exit'): ").strip()
        if query.lower() == "exit":
            break

        top_results = search_by_text(query, image_embeddings, top_k=5)

        print("\nShowing top matching images:")
        for i, (path, score) in enumerate(top_results):
            print(f"{i+1}. {os.path.basename(path)}  -->  Score: {score:.4f}")
            img = cv2.imread(path)
            if img is not None:
                img = cv2.resize(img, (400, 400))
                cv2.imshow(f"Match {i+1}: {os.path.basename(path)}", img)
        print("\nPress any key on any image window to continue...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
