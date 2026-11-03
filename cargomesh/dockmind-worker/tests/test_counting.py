from dataclasses import replace

import pytest

from conftest import track
from dockmind.counting import count_crossings
from dockmind.models import Box, CountingLine, Direction, FlagKind, ObservationStatus
from dockmind.sam_output import SamOutputError

FPS = 10


def run(boxes, config, total_frames=60):
    return count_crossings(boxes, config, fps=FPS, total_frames=total_frames)


def kinds(result):
    return {flag.kind for flag in result.flags}


def test_single_crossing_counts_one_entry(config):
    result = run(track(1, [300 + 40 * i for i in range(11)]), config)
    assert (result.entries, result.exits, result.net) == (1, 0, 1)
    assert result.status is ObservationStatus.OK
    (event,) = result.events
    assert event.direction is Direction.IN
    assert event.seconds == pytest.approx(event.frame / FPS)


def test_object_hovering_on_the_line_is_not_counted_repeatedly(config):
    xs = [380, 420, 460] + [500 + (20 if i % 2 else -20) for i in range(10)] + [440, 400, 380]
    result = run(track(1, xs), config)
    assert result.net == 0
    assert result.events == ()
    assert result.status is ObservationStatus.OK


def test_fast_back_and_forth_beyond_the_band_counts_once(config):
    xs = [400, 460, 540, 460, 540, 460, 540, 600, 650, 700]
    result = run(track(1, xs), config)
    assert [e.direction for e in result.events] == [Direction.IN]
    assert result.events[0].frame == 6


def test_exit_and_reentry_are_separate_events(config):
    forward = [300 + 40 * i for i in range(11)]
    xs = forward + forward[::-1] + forward
    result = run(track(1, xs), config, total_frames=80)
    assert [e.direction for e in result.events] == [Direction.IN, Direction.OUT, Direction.IN]
    assert (result.entries, result.exits, result.net) == (2, 1, 1)


def test_identity_lost_at_the_line_requires_review(config):
    before = track(1, [300, 340, 380, 420, 450], start=0)
    after = track(2, [560, 600, 640, 680], start=7)
    result = run(before + after, config)
    assert FlagKind.ID_SWITCH_SUSPECTED in kinds(result)
    assert result.status is ObservationStatus.REQUIRES_REVIEW
    assert result.net == 0  # nadie vio el cruce: no se inventa


def test_identity_change_on_the_same_side_needs_no_review(config):
    before = track(1, [300 + 40 * i for i in range(8)], start=0)  # termina adentro en 580, junto a la línea
    after = track(2, [580, 620, 660], start=9)  # el mismo bulto sigue adentro con otro ID
    result = run(before + after, config)
    assert result.net == 1
    assert result.status is ObservationStatus.OK


def test_track_lost_on_the_line_requires_review(config):
    result = run(track(1, [400, 440, 480, 500]), config)
    assert FlagKind.TRACK_LOST_NEAR_LINE in kinds(result)


def test_object_appearing_inside_next_to_the_line_requires_review(config):
    result = run(track(1, [440, 400, 380], start=0) + track(2, [560, 600, 650], start=20), config)
    assert FlagKind.TRACK_LOST_NEAR_LINE in kinds(result)
    assert result.net == 0


def test_short_track_is_ignored_but_flagged_if_it_crossed(config):
    result = run(track(1, [400, 600]), config)
    assert result.net == 0
    assert result.tracks_counted == 0
    assert FlagKind.SHORT_TRACK_CROSSED in kinds(result)


def test_object_already_inside_is_not_counted(config):
    result = run(track(1, [700, 750, 800, 850]), config)
    assert result.events == ()
    assert result.status is ObservationStatus.OK


def test_object_that_never_crosses_is_not_counted(config):
    result = run(track(1, [100, 150, 200, 250, 200, 150]), config)
    assert result.net == 0
    assert result.status is ObservationStatus.OK


def test_two_boxes_crossing_together_count_two(config):
    xs = [300 + 40 * i for i in range(11)]
    result = run(track(1, xs, y=150) + track(2, xs, y=350), config)
    assert result.entries == 2


def test_reaching_the_object_limit_requires_review(config):
    boxes = [box for object_id in range(16) for box in track(object_id, [100, 110, 120], y=20 + 25 * object_id)]
    result = run(boxes, config)
    assert result.max_objects_in_frame == 16
    assert FlagKind.OBJECT_LIMIT_REACHED in kinds(result)


def test_clip_ending_with_object_on_the_line_requires_review(config):
    result = run(track(1, [400, 440, 480, 500]), config, total_frames=4)
    assert FlagKind.ENDS_ON_LINE in kinds(result)


def test_empty_detection_is_insufficient_evidence(config):
    result = run([], config)
    assert result.status is ObservationStatus.INSUFFICIENT_EVIDENCE
    assert result.net == 0


def test_inside_point_on_the_line_is_rejected(config):
    bad = replace(config, line=CountingLine(0.5, 0.0, 0.5, 1.0, 0.5, 0.3))
    with pytest.raises(ValueError):
        run(track(1, [300, 700]), bad)


def test_mixed_frame_sizes_are_a_contract_change(config):
    boxes = track(1, [300, 340, 380])
    boxes.append(replace(boxes[-1], frame=3, frame_width=640))
    with pytest.raises(SamOutputError):
        run(boxes, config)


def test_crossing_outside_the_drawn_segment_is_ignored(config):
    door = replace(config, line=CountingLine(0.5, 0.0, 0.5, 0.4, 0.8, 0.2))  # la puerta cubre y de 0 a 200
    xs = [300 + 40 * i for i in range(11)]
    assert run(track(1, xs, y=350), door).net == 0
    assert run(track(1, xs, y=100), door).net == 1


def test_a_box_counts_only_once_it_is_completely_across(config):
    centers = [300, 380, 560, 600, 640, 700, 760]
    wide = [Box(i, 1, c - 100, 230, c + 100, 270, 1000, 500) for i, c in enumerate(centers)]
    result = run(wide, config)
    assert [e.frame for e in result.events] == [4]  # con el centro habría contado en el cuadro 2, aún montada


def test_diagonal_line_and_inside_on_the_left(config):
    # Línea diagonal; adentro está arriba a la izquierda. Una caja que va de abajo-derecha a arriba-izquierda entra.
    diagonal = replace(config, line=CountingLine(0.0, 1.0, 1.0, 0.0, 0.1, 0.1))
    boxes = [
        replace(box, y1=box.y1 - 20 * i, y2=box.y2 - 20 * i)
        for i, box in enumerate(track(1, [800 - 50 * i for i in range(12)], y=420))
    ]
    result = run(boxes, diagonal)
    assert [e.direction for e in result.events] == [Direction.IN]


def test_id_reused_after_leaving_the_frame_is_not_an_exit(config):
    """Como en la cinta real: SAM le da el ID de un bulto que ya salió a uno nuevo que llega por la izquierda."""
    first = track(1, [300 + 60 * i for i in range(12)] + [975])
    second = track(1, [40 + 60 * i for i in range(12)], start=30)
    result = run(first + second, config, total_frames=60)
    assert (result.entries, result.exits, result.net) == (2, 0, 2)
    assert result.status is ObservationStatus.OK
