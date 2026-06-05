import Card from "../shared/Card.jsx";
import VictoryPlanView from "../views/VictoryPlanView.jsx";

export default function VictoryPlanCard(props) {
    return (
        <Card {...props} title="Victory Plan">
            <VictoryPlanView state={props.state} />
        </Card>
    );
}