import Card from "../shared/Card.jsx";
import ServiceHealthView from "../views/ServiceHealthView.jsx";

export default function ServiceHealthCard(props) {
    return (
        <Card {...props} title="Service Health">
            <ServiceHealthView state={props.state} />
        </Card>
    );
}