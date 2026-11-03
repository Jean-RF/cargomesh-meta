import pytest

from conftest import track
from dockmind.sam_output import SamOutputError
from dockmind.tracks import build_tracks


def test_same_id_in_ten_frames_is_one_track():
    tracks = build_tracks(track(7, [100 + 10 * i for i in range(10)]), total_frames=10)
    assert len(tracks) == 1
    assert len(tracks[0].boxes) == 10
    assert (tracks[0].first_frame, tracks[0].last_frame) == (0, 9)


def test_frame_outside_the_clip_is_rejected():
    with pytest.raises(SamOutputError):
        build_tracks(track(1, [100, 110, 120], start=8), total_frames=10)


def test_duplicate_id_in_same_frame_keeps_first():
    boxes = track(1, [100]) + track(1, [900])
    (only,) = build_tracks(boxes)
    assert len(only.boxes) == 1
    assert only.boxes[0].center[0] == 100


def test_tracks_are_ordered_by_first_frame():
    tracks = build_tracks(track(2, [100, 110], start=5) + track(9, [100, 110], start=1))
    assert [t.object_id for t in tracks] == [9, 2]


def test_id_reused_after_leaving_through_the_edge_is_a_new_track():
    gone = track(1, [900, 940, 975])
    back = track(1, [30, 60, 90], start=20)
    first, second = build_tracks(gone + back)
    assert (first.object_id, first.segment, first.last_frame) == (1, 0, 2)
    assert (second.object_id, second.segment, second.first_frame) == (1, 1, 20)
    assert second.name == "ID 1 (tramo 2)"


def test_impossible_jump_splits_the_id():
    boxes = track(4, [800, 810, 820]) + track(4, [100, 110], start=3)
    assert [t.segment for t in build_tracks(boxes)] == [0, 1]


def test_occlusion_in_the_middle_keeps_one_track():
    boxes = track(2, [300, 320, 340]) + track(2, [500, 520], start=12)
    assert len(build_tracks(boxes)) == 1


def test_short_gap_at_the_edge_keeps_one_track():
    boxes = track(3, [960, 975]) + track(3, [975, 960], start=5)
    assert len(build_tracks(boxes)) == 1
