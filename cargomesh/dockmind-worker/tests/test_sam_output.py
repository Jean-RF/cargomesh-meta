import pytest

from dockmind.models import Box
from dockmind.sam_output import SamOutputError, format_frame, parse_sam_output

# Primer registro tomado del ejemplo de la documentación de Meta; el segundo sigue la misma gramática.
DOC_LINE = (
    "<0f>0<|box;x1=211;y1=228;x2=270;y2=254;w=320;h=334|>"
    "<|mask;x=0;y=0;data=27,60,~!!!!M!0c[0o91w?q1!pIH4pPRVp2B3'7`e.ioeAf6-k/#Xd8%dX9x(|>,"
    "1<|box;x1=155;y1=100;x2=200;y2=150;w=320;h=334;c=0.87|>"
)


def test_reads_boxes_and_ignores_masks():
    boxes = parse_sam_output(DOC_LINE)
    assert [(b.frame, b.object_id) for b in boxes] == [(0, 0), (0, 1)]
    assert (boxes[0].x1, boxes[0].y1, boxes[0].x2, boxes[0].y2) == (211, 228, 270, 254)
    assert (boxes[0].frame_width, boxes[0].frame_height) == (320, 334)
    assert boxes[0].confidence is None
    assert boxes[1].confidence == pytest.approx(0.87)


def test_frames_can_skip_and_come_out_of_order():
    text = "<5f>3<|box;x1=1;y1=1;x2=5;y2=5;w=10;h=10|>\n<2f>3<|box;x1=1;y1=1;x2=5;y2=5;w=10;h=10|>\n"
    assert [b.frame for b in parse_sam_output(text)] == [5, 2]


def test_empty_output_means_no_detections():
    assert parse_sam_output("") == []
    assert parse_sam_output("\n\n") == []


def test_line_without_frame_marker_is_a_contract_change():
    with pytest.raises(SamOutputError):
        parse_sam_output("0<|box;x1=1;y1=1;x2=5;y2=5;w=10;h=10|>")


def test_box_missing_fields_is_a_contract_change():
    with pytest.raises(SamOutputError):
        parse_sam_output("<0f>0<|box;x1=1;y1=1;x2=5;y2=5;w=10|>")


def test_inverted_box_is_rejected():
    with pytest.raises(SamOutputError):
        parse_sam_output("<0f>0<|box;x1=9;y1=1;x2=5;y2=5;w=10;h=10|>")


def test_format_and_parse_round_trip():
    boxes = [Box(7, 4, 10, 20, 30, 40, 640, 360, 0.5), Box(7, 9, 1, 2, 3, 4, 640, 360)]
    assert parse_sam_output(format_frame(7, boxes)) == boxes
