// =====================================================
// MQTT
// =====================================================

const MQTT_URL = "ws://broker.emqx.io:8083/mqtt";

const DATA_TOPIC = "bondowdata";
const CONTROL_TOPIC = "bonupdata";

const clientId =
    "WEB_SLOT1_" +
    Math.random().toString(16).substring(2, 10);


// =====================================================
// KẾT NỐI
// =====================================================

const mqttClient = mqtt.connect(MQTT_URL, {
    clientId: clientId,
    clean: true,
    connectTimeout: 5000,
    reconnectPeriod: 2000
});


// =====================================================
// MQTT CONNECT
// =====================================================

mqttClient.on("connect", function () {

    document.getElementById("status").innerText =
        "● MQTT đã kết nối";

    mqttClient.subscribe(
        DATA_TOPIC,
        function(error) {

            if (!error) {

                document.getElementById("subStatus").innerText =
                    "Đã subscribe bondowdata";

                console.log(
                    "Subscribed:",
                    DATA_TOPIC
                );
            }
        }
    );
});


// =====================================================
// OFFLINE
// =====================================================

mqttClient.on("offline", function () {

    document.getElementById("status").innerText =
        "● MQTT mất kết nối";
});


// =====================================================
// ERROR
// =====================================================

mqttClient.on("error", function(error) {

    console.error(
        "MQTT ERROR:",
        error
    );
});


// =====================================================
// NHẬN MQTT
// =====================================================

mqttClient.on("message", function(topic, message) {

    if (topic !== DATA_TOPIC) {
        return;
    }

    let data;

    try {

        data = JSON.parse(
            message.toString()
        );

    }
    catch(error) {

        console.error(
            "JSON ERROR:",
            error
        );

        return;
    }


    console.log(
        "MQTT RECEIVE:",
        data
    );


    // =================================================
    // RFID
    // =================================================

    if (data.event === "RFID") {

        document.getElementById("rfid").innerText =
            data.uid;

        document.getElementById("slot1User").innerText =
            data.uid;

        document.getElementById("currentUser").innerText =
            data.uid;

        document.getElementById("activeSlot").innerText =
            "01";

        updateSlot1(
            data.status,
            data.uid
        );

        updateTime();
    }


    // =================================================
    // RFID BỊ TỪ CHỐI
    // =================================================

    if (data.event === "RFID_DENIED") {

        document.getElementById("rfid").innerText =
            data.uid;

        document.getElementById("activeSlot").innerText =
            "01";

        document.getElementById("alertBox").innerText =
            "Thẻ bị từ chối: " +
            data.reason;

        updateTime();
    }


    // =================================================
    // STATUS
    // =================================================

    if (data.event === "STATUS") {

        if (data.slot !== 1) {
            return;
        }

        updateSlot1(
            data.status,
            data.user
        );

        updateTime();
    }


    // =================================================
    // COMMAND DENIED
    // =================================================

    if (data.event === "COMMAND_DENIED") {

        document.getElementById("alertBox").innerText =
            "Không thể mở ngăn: " +
            data.reason;

        updateTime();
    }

});


// =====================================================
// CẬP NHẬT NGĂN 1
// =====================================================

function updateSlot1(status, user) {

    const statusElement =
        document.getElementById("slot1Status");

    const button =
        document.getElementById("slot1Button");

    const dot =
        document.querySelector("#slot1 .dot");


    statusElement.innerText =
        status;


    // =================================================
    // SẴN SÀNG
    // =================================================

    if (status === "SẴN SÀNG") {

        dot.style.backgroundColor =
            "green";

        button.innerText =
            "Mở ngăn";

        button.disabled =
            false;

        document.getElementById("slot1User").innerText =
            "--";

        document.getElementById("currentUser").innerText =
            "--";

        document.getElementById("availableCount").innerText =
            "1";

        document.getElementById("borrowedCount").innerText =
            "0";

        document.getElementById("alertBox").innerText =
            "Ngăn 01 sẵn sàng.";
    }


    // =================================================
    // ĐANG MƯỢN
    // =================================================

    else if (status === "ĐANG MƯỢN") {

        dot.style.backgroundColor =
            "orange";

        button.innerText =
            "Mở ngăn";

        button.disabled =
            false;

        document.getElementById("slot1User").innerText =
            user || "--";

        document.getElementById("currentUser").innerText =
            user || "--";

        document.getElementById("availableCount").innerText =
            "0";

        document.getElementById("borrowedCount").innerText =
            "1";

        document.getElementById("alertBox").innerText =
            "Ngăn 01 đang được mượn.";
    }


    // =================================================
    // ĐANG BẢO TRÌ
    // =================================================

    else if (status === "ĐANG BẢO TRÌ") {

        dot.style.backgroundColor =
            "red";

        button.innerText =
            "Kết thúc bảo trì";

        button.disabled =
            false;

        document.getElementById("slot1User").innerText =
            "--";

        document.getElementById("currentUser").innerText =
            "QUẢN LÝ";

        document.getElementById("availableCount").innerText =
            "0";

        document.getElementById("borrowedCount").innerText =
            "0";

        document.getElementById("alertBox").innerText =
            "Ngăn 01 đang được quản lý kiểm tra/bảo trì.";
    }
}


// =====================================================
// NÚT MỞ NGĂN / KẾT THÚC BẢO TRÌ
// =====================================================

function toggleMaintenance(slot) {

    if (slot !== 1) {

        alert(
            "Hiện tại chỉ thử nghiệm ngăn 01."
        );

        return;
    }


    const currentStatus =
        document.getElementById(
            "slot1Status"
        ).innerText;


    let command;


    if (currentStatus === "ĐANG BẢO TRÌ") {

        command =
            "END_MAINTENANCE";

    }
    else {

        command =
            "OPEN";
    }


    const data = {

        command: command,

        slot: 1
    };


    if (!mqttClient.connected) {

        alert(
            "MQTT chưa kết nối!"
        );

        return;
    }


    mqttClient.publish(
        CONTROL_TOPIC,
        JSON.stringify(data)
    );


    console.log(
        "SEND:",
        data
    );
}


// =====================================================
// NÚT SUBSCRIBE
// =====================================================

document.getElementById(
    "btnSubscribe"
).addEventListener(
    "click",
    function() {

        const topic =
            document.getElementById(
                "subTopic"
            ).value;

        mqttClient.subscribe(
            topic,
            function(error) {

                if (!error) {

                    document.getElementById(
                        "subStatus"
                    ).innerText =
                        "Đã subscribe " + topic;
                }
            }
        );
    }
);


// =====================================================
// NÚT UNSUBSCRIBE
// =====================================================

document.getElementById(
    "btnUnsubscribe"
).addEventListener(
    "click",
    function() {

        const topic =
            document.getElementById(
                "subTopic"
            ).value;

        mqttClient.unsubscribe(
            topic,
            function(error) {

                if (!error) {

                    document.getElementById(
                        "subStatus"
                    ).innerText =
                        "Chưa subscribe";
                }
            }
        );
    }
);


// =====================================================
// THỜI GIAN
// =====================================================

function updateTime() {

    const now =
        new Date();

    document.getElementById(
        "lastUpdate"
    ).innerText =
        now.toLocaleTimeString("vi-VN");
}