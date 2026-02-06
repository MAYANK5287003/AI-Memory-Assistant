# face_clustering.py

import numpy as np
from sklearn.cluster import DBSCAN


def cluster_face_embeddings(
    embeddings: list,
    eps: float = 0.35,
    min_samples: int = 3
):
    """
    Args:
        embeddings: list of (face_id, embedding)
        eps: cosine distance threshold
        min_samples: minimum faces to form an identity

    Returns:
        dict: face_id -> cluster_id
              cluster_id = -1 means noise / unknown
    """

    if not embeddings:
        return {}

    face_ids = [f[0] for f in embeddings]
    X = np.vstack([f[1] for f in embeddings])

    clustering = DBSCAN(
        eps=eps,
        min_samples=min_samples,
        metric="cosine"
    ).fit(X)

    labels = clustering.labels_

    return {
        face_id: int(label)
        for face_id, label in zip(face_ids, labels)
    }
