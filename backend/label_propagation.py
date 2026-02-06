# label_propagation.py

class LabelPropagation:
    """
    Manages editable identity labels at cluster level.
    Labels are NOT stored per face.
    """

    def __init__(self):
        # cluster_id -> label
        self.cluster_labels = {}

    # ---- LABEL OPERATIONS ----

    def set_label(self, cluster_id: int, label: str):
        if cluster_id == -1:
            raise ValueError("Cannot label noise cluster (-1)")
        self.cluster_labels[cluster_id] = label

    def rename_label(self, cluster_id: int, new_label: str):
        if cluster_id not in self.cluster_labels:
            raise KeyError("Cluster has no label to rename")
        self.cluster_labels[cluster_id] = new_label

    def remove_label(self, cluster_id: int):
        if cluster_id in self.cluster_labels:
            del self.cluster_labels[cluster_id]

    def get_label(self, cluster_id: int):
        return self.cluster_labels.get(cluster_id)

    # ---- PROPAGATION (READ-ONLY) ----

    def propagate_labels(self, cluster_map: dict):
        """
        cluster_map: face_id -> cluster_id

        Returns:
            face_id -> {label, source}
        """
        labeled_faces = {}

        for face_id, cluster_id in cluster_map.items():
            label = self.get_label(cluster_id)
            if label:
                labeled_faces[face_id] = {
                    "label": label,
                    "source": "propagated"
                }

        return labeled_faces
