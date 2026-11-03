from dockmind.models import CountConfig, CountingLine, Unit
from dockmind.roi import MIN_SIDE, Roi, config_for_roi, roi_for_line


def _config(line: CountingLine) -> CountConfig:
    return CountConfig(line=line, unit=Unit.BOX, concept="package")


def _side(line: CountingLine, x: float, y: float) -> float:
    return (line.x2 - line.x1) * (y - line.y1) - (line.y2 - line.y1) * (x - line.x1)


def test_full_height_line_keeps_the_whole_frame():
    assert roi_for_line(CountingLine(0.5, 0, 0.5, 1, 0.8, 0.5), 1280, 720) is None


def test_short_line_gets_a_corridor_with_even_sides():
    roi = roi_for_line(CountingLine(0.70, 0.40, 0.70, 0.62, 0.85, 0.5), 1280, 720)
    assert roi == Roi(642, 192, 506, 348)
    assert all(value % 2 == 0 for value in (roi.x, roi.y, roi.width, roi.height))


def test_diagonal_line_stays_inside_the_window_and_the_frame():
    line = CountingLine(0.2, 0.3, 0.4, 0.5, 0.5, 0.2)
    roi = roi_for_line(line, 1920, 1080)
    assert roi is not None
    assert 0 <= roi.x and roi.x + roi.width <= 1920 and 0 <= roi.y and roi.y + roi.height <= 1080
    for x, y in ((line.x1 * 1920, line.y1 * 1080), (line.x2 * 1920, line.y2 * 1080)):
        assert roi.x <= x <= roi.x + roi.width and roi.y <= y <= roi.y + roi.height


def test_tiny_line_still_gets_a_usable_window():
    roi = roi_for_line(CountingLine(0.5, 0.5, 0.5, 0.52, 0.6, 0.5), 1280, 720)
    assert roi is not None and roi.width >= MIN_SIDE - 1 and roi.height >= MIN_SIDE - 1


def test_config_keeps_pixel_distances_and_the_inside_side():
    line = CountingLine(0.70, 0.40, 0.70, 0.62, 0.99, 0.5)
    roi = roi_for_line(line, 1280, 720)
    moved = config_for_roi(_config(line), roi, 1280, 720)
    assert abs(moved.line.x1 - (896 - 642) / 506) < 1e-9
    assert abs(moved.margin * roi.width - 0.01 * 1280) < 1e-9
    assert abs(moved.near_zone * roi.width - 0.09 * 1280) < 1e-9
    assert 0.05 <= moved.line.inside_x <= 0.95
    original = _side(line, line.inside_x, line.inside_y)
    assert original * _side(moved.line, moved.line.inside_x, moved.line.inside_y) > 0
