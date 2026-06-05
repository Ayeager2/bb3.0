import Card from "../shared/Card.jsx";
import LaneAllocationView from "../views/LaneAllocationView.jsx";

export default function LaneAllocationCard(props) {
    return (
        <Card {...props} title="Lane Allocation">
            <LaneAllocationView state={props.state} />
        </Card>
    );
}