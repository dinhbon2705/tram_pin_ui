// =====================================================
// CẤU HÌNH MQTT
// =====================================================

const MQTT_URL = "wss://broker.emqx.io:8084/mqtt";

const DATA_TOPIC = "bondowdata";


// =====================================================
// TẠO CLIENT ID RIÊNG
// =====================================================

const clientId =
    "VIEWER_" +
    Math.random()
        .toString(16)
        .substring(2, 10);

console.log("Viewer ID:", clientId);


// =====================================================
// KẾT NỐI MQTT
// =====================================================

const mqttClient = mqtt.connect(
    MQTT_URL,
    {
        clientId: clientId,

        clean: true,

        connectTimeout: 10000,

        reconnectPeriod: 3000
    }
);


// =====================================================
// KẾT NỐI THÀNH CÔNG
// =====================================================

mqttClient.on(
    "connect",
    function()
    {
        console.log("MQTT Viewer connected");


        document.getElementById(
            "status"
        ).innerText =
            "● MQTT đã kết nối";


        // Chỉ subscribe
        mqttClient.subscribe(
            DATA_TOPIC,
            {
                qos: 0
            },
            function(error)
            {

                if (error)
                {
                    console.error(
                        "Subscribe lỗi:",
                        error
                    );

                    document.getElementById(
                        "subStatus"
                    ).innerText =
                        "Subscribe lỗi";
                }
                else
                {
                    console.log(
                        "Đã subscribe:",
                        DATA_TOPIC
                    );

                    document.getElementById(
                        "subStatus"
                    ).innerText =
                        "Đang nhận dữ liệu";
                }

            }
        );
    }
);


// =====================================================
// ĐANG KẾT NỐI LẠI
// =====================================================

mqttClient.on(
    "reconnect",
    function()
    {
        document.getElementById(
            "status"
        ).innerText =
            "● Đang kết nối lại...";

        document.getElementById(
            "subStatus"
        ).innerText =
            "Đang thử kết nối lại...";
    }
);


// =====================================================
// OFFLINE
// =====================================================

mqttClient.on(
    "offline",
    function()
    {
        document.getElementById(
            "status"
        ).innerText =
            "● MQTT mất kết nối";
    }
);


// =====================================================
// ERROR
// =====================================================

mqttClient.on(
    "error",
    function(error)
    {
        console.error(
            "MQTT ERROR:",
            error
        );
    }
);


// =====================================================
// NHẬN DỮ LIỆU MQTT
// =====================================================

mqttClient.on(
    "message",
    function(topic, message)
    {

        if (topic !== DATA_TOPIC)
        {
            return;
        }


        const text =
            message.toString();


        console.log(
            "MQTT RECEIVE:",
            text
        );


        let data;


        try
        {
            data = JSON.parse(text);
        }
        catch(error)
        {
            console.error(
                "JSON không hợp lệ:",
                text
            );

            return;
        }


        // thời gian cập nhật
        updateTime();


        // =================================================
        // STATUS
        // =================================================

        if (data.event === "STATUS")
        {
            handleStatus(data);
        }


        // =================================================
        // RFID
        // =================================================

        else if (data.event === "RFID")
        {
            handleRFID(data);
        }


        // =================================================
        // RFID DENIED
        // =================================================

        else if (data.event === "RFID_DENIED")
        {
            handleRFIDDenied(data);
        }


        // =================================================
        // COMMAND DENIED
        // =================================================

        else if (data.event === "COMMAND_DENIED")
        {
            handleCommandDenied(data);
        }


        // =================================================
        // IR
        // =================================================

        else if (data.event === "IR")
        {
            handleIR(data);
        }


        // =================================================
        // DỮ LIỆU CÓ battery
        // =================================================

        if (
            data.slot &&
            typeof data.battery !== "undefined"
        )
        {
            updateBattery(
                Number(data.slot),
                Number(data.battery)
            );
        }


        // =================================================
        // DỮ LIỆU CÓ voltage
        // =================================================

        if (
            typeof data.voltage !== "undefined"
        )
        {
            document.getElementById(
                "voltage"
            ).innerText =
                Number(data.voltage).toFixed(2);
        }

    }
);


// =====================================================
// STATUS
// =====================================================

function handleStatus(data)
{

    const slot =
        Number(data.slot);


    if (
        slot < 1 ||
        slot > 4
    )
    {
        return;
    }


    const status =
        data.status ||
        "CHƯA CÓ DỮ LIỆU";


    const user =
        data.user ||
        "--";


    updateSlot(
        slot,
        status,
        user
    );


    document.getElementById(
        "activeSlot"
    ).innerText =
        String(slot).padStart(2, "0");


    // ---------------------------------------------
    // thông báo
    // ---------------------------------------------

    if (slot === 1)
    {

        if (status === "SẴN SÀNG")
        {
            document.getElementById(
                "alertBox"
            ).innerText =
                "Ngăn 01 đang sẵn sàng.";
        }


        else if (status === "ĐANG MƯỢN")
        {
            document.getElementById(
                "alertBox"
            ).innerText =
                "Ngăn 01 đang được sử dụng.";
        }


        else if (status === "ĐANG BẢO TRÌ")
        {
            document.getElementById(
                "alertBox"
            ).innerText =
                "Ngăn 01 đang được quản lý kiểm tra/bảo trì.";
        }
    }

}


// =====================================================
// RFID
// =====================================================

function handleRFID(data)
{

    const uid =
        data.uid || "--";


    document.getElementById(
        "rfid"
    ).innerText =
        uid;


    if (data.slot === 1)
    {

        document.getElementById(
            "slot1User"
        ).innerText =
            uid;


        document.getElementById(
            "currentUser"
        ).innerText =
            uid;


        document.getElementById(
            "activeSlot"
        ).innerText =
            "01";


        updateSlot(
            1,
            data.status,
            uid
        );

    }


    document.getElementById(
        "alertBox"
    ).innerText =
        "✅ Đã nhận thẻ RFID: " + uid;

}


// =====================================================
// RFID DENIED
// =====================================================

function handleRFIDDenied(data)
{

    const uid =
        data.uid || "--";


    document.getElementById(
        "rfid"
    ).innerText =
        uid;


    document.getElementById(
        "activeSlot"
    ).innerText =
        "01";


    document.getElementById(
        "alertBox"
    ).innerText =
        "⚠️ Thẻ bị từ chối: " +
        (data.reason || "Không được phép");

}


// =====================================================
// COMMAND DENIED
// =====================================================

function handleCommandDenied(data)
{

    document.getElementById(
        "alertBox"
    ).innerText =
        "⚠️ " +
        (data.reason || "Lệnh bị từ chối");

}


// =====================================================
// IR
// =====================================================

function handleIR(data)
{

    if (data.slot !== 1)
    {
        return;
    }


    const ir =
        Number(data.ir);


    if (ir === 0)
    {

        document.getElementById(
            "door"
        ).innerText =
            "PHÁT HIỆN";

    }
    else
    {

        document.getElementById(
            "door"
        ).innerText =
            "BÌNH THƯỜNG";
    }

}


// =====================================================
// CẬP NHẬT NGĂN
// =====================================================

function updateSlot(
    slot,
    status,
    user
)
{

    const statusElement =
        document.getElementById(
            `slot${slot}Status`
        );


    const userElement =
        document.getElementById(
            `slot${slot}User`
        );


    const dot =
        document.querySelector(
            `#slot${slot} .dot`
        );


    if (!statusElement)
    {
        return;
    }


    statusElement.innerText =
        status;


    if (userElement)
    {
        userElement.innerText =
            user || "--";
    }


    // =================================================
    // SẴN SÀNG
    // =================================================

    if (
        status === "SẴN SÀNG" ||
        status === "SẴN"
    )
    {

        if (dot)
        {
            dot.style.background =
                "#22c55e";
        }

    }


    // =================================================
    // ĐANG MƯỢN
    // =================================================

    else if (
        status === "ĐANG MƯỢN" ||
        status === "MƯỢN"
    )
    {

        if (dot)
        {
            dot.style.background =
                "#f97316";
        }

    }


    // =================================================
    // ĐANG BẢO TRÌ
    // =================================================

    else if (
        status === "ĐANG BẢO TRÌ"
    )
    {

        if (dot)
        {
            dot.style.background =
                "#ef4444";
        }


        if (userElement)
        {
            userElement.innerText =
                "QUẢN LÝ";
        }

    }


    // =================================================
    // CHƯA CÓ DỮ LIỆU
    // =================================================

    else
    {

        if (dot)
        {
            dot.style.background =
                "#9ca3af";
        }

    }


    updateSummary();

}


// =====================================================
// CẬP NHẬT PIN
// =====================================================

function updateBattery(
    slot,
    battery
)
{

    if (
        slot < 1 ||
        slot > 4
    )
    {
        return;
    }


    if (
        isNaN(battery)
    )
    {
        return;
    }


    battery =
        Math.max(
            0,
            Math.min(
                100,
                battery
            )
        );


    const value =
        document.getElementById(
            `slot${slot}Battery`
        );


    const bar =
        document.getElementById(
            `slot${slot}Bar`
        );


    if (value)
    {
        value.innerText =
            Math.round(battery);
    }


    if (bar)
    {
        bar.style.width =
            battery + "%";
    }

}


// =====================================================
// THỐNG KÊ
// =====================================================

function updateSummary()
{

    let available = 0;

    let borrowed = 0;


    for (
        let i = 1;
        i <= 4;
        i++
    )
    {

        const element =
            document.getElementById(
                `slot${i}Status`
            );


        if (!element)
        {
            continue;
        }


        const status =
            element.innerText.trim();


        if (
            status === "SẴN SÀNG" ||
            status === "SẴN"
        )
        {
            available++;
        }


        if (
            status === "ĐANG MƯỢN" ||
            status === "MƯỢN"
        )
        {
            borrowed++;
        }

    }


    document.getElementById(
        "availableCount"
    ).innerText =
        available;


    document.getElementById(
        "borrowedCount"
    ).innerText =
        borrowed;

}


// =====================================================
// THỜI GIAN
// =====================================================

function updateTime()
{

    document.getElementById(
        "lastUpdate"
    ).innerText =
        new Date().toLocaleTimeString(
            "vi-VN"
        );

}


// =====================================================
// KHỞI TẠO
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function()
    {

        // Tất cả ngăn ban đầu
        for (
            let i = 1;
            i <= 4;
            i++
        )
        {

            const status =
                document.getElementById(
                    `slot${i}Status`
                );


            const battery =
                document.getElementById(
                    `slot${i}Battery`
                );


            if (status)
            {
                status.innerText =
                    "CHƯA CÓ DỮ LIỆU";
            }


            if (battery)
            {
                battery.innerText =
                    "--";
            }

        }


        document.getElementById(
            "currentUser"
        ).innerText =
            "--";


        document.getElementById(
            "activeSlot"
        ).innerText =
            "--";


        document.getElementById(
            "rfid"
        ).innerText =
            "--";


        document.getElementById(
            "door"
        ).innerText =
            "--";


        document.getElementById(
            "voltage"
        ).innerText =
            "--";


        document.getElementById(
            "lastUpdate"
        ).innerText =
            "--";


        updateSummary();

    }
);