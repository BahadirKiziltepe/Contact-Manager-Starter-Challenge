﻿"use strict";

$(function () {
    loadContactTable();
    initSignalr();

    $(document).on("dblclick", ".editContact", function () {
        let buttonClicked = $(this);
        let id = buttonClicked.data("id");
        $.ajax({
            type: "GET",
            url: "/Contacts/EditContact",
            contentType: "application/json; charset=utf-8",
            data: { "Id": id },
            datatype: "json",
            success: function (data) {
                $('#EditContactModalContent').html(data);
                $('#modal-editContact').modal('show');
                $("#ServerErrorAlert").hide();
            },
            error: function () {
                $("#ServerErrorAlert").show();
            }
        });
    });

    $(document).on("click", ".deleteContact", function () {
        let buttonClicked = $(this);
        let id = buttonClicked.data("id");
        $("#deleteContactConfirmed").data("id", id);
    });

    $(document).on("click", "#addNewEmail", function () {
        let emailAddress = $('#newEmailAddress').val();
        let emailAddressType = $('#newEmailAddressType').val();
        let emailTypeClass = emailAddressType === "Personal" ? "badge-primary" : "badge-success";
        let emailTypeBadge = '<span class="badge ' + emailTypeClass + ' m-l-10">' + emailAddressType + '</span>';

        if (validateEmail(emailAddress)) {
            let newListItem = '<li class="list-group-item emailListItem" data-email="' + emailAddress + '" data-type="' + emailAddressType + '">' +
                emailTypeBadge +
                '<a class="pointer setPrimary primary-indicator m-l-10">Set Primary</a>' +
                '<span class="m-l-20">' + emailAddress + '</span>' +
                '<a class="redText pointer float-right removeEmail" title="Delete Email">X</a>' +
                '</li>';

            $("#emailList").append(newListItem);
            $('#newEmailAddress').val("").removeClass("invalidInput");
            $('#invalidEmailFeedback').hide();
        } else {
            $('#newEmailAddress').addClass("invalidInput");
            $('#invalidEmailFeedback').show();
        }
    });


    $(document).on("click", "#addNewAddress", function () {
        let street1 = $('#newAddressStreet1').val();
        let street2 = $('#newAddressStreet2').val();
        let city = $('#newAddressCity').val();
        let state = $('#newAddressState').val();
        let zip = $('#newAddressZip').val()

        let address = street1 + " " +
            street2 + " " +
            city + " " +
            state + " " +
            zip;

        let addressType = $('#newAddressType').val();
        let addressTypeClass;

        if (addressType === "Primary") {
            addressTypeClass = "badge-primary"; //blue badge
        } else {
            addressTypeClass = "badge-success"; //green badge
        }

        if (validateAddress(street1, city, state, zip)) {
            $("#addressList").append(
                '<li class="list-group-item addressListItem" data-street1="' + street1 + '" data-street2="' + street2 + '" data-city="' +
                city + '" data-state="' + state + '" data-zip="' + zip + '" data-type="' + addressType + '">' +
                '<span class="badge ' + addressTypeClass + ' m-l-10">' + addressType + '</span>' +
                '<span class="m-l-20">' + address + ' </span>' +
                '<a class="redText pointer float-right removeAddress" title="Delete Address">X</a>' +
                '</li>');

            $('#newAddressStreet1').val("");
            $('#newAddressStreet2').val("");
            $('#newAddressCity').val("");
            $('#newAddressState').val("");
            $('#newAddressZip').val("");

            $('.addressInput').removeClass("invalidInput");

            $('.addressFeedback').hide();
        }
    });

    $(document).on("click", ".removeEmail", function () {
        $(this).parent().remove();
    });

    $(document).on("click", ".removeAddress", function () {
        $(this).parent().remove();
    });

    // This JavaScript function is designed for updating the primary email status within a list.
    $(document).on("click", "#emailList .emailListItem .setPrimary", function () {
        let emailListItem = $(this).closest(".emailListItem");
        let email = emailListItem.data("email");
        let contactId = $("#contactId").val();
        $.ajax({
            type: "POST",
            url: "/Contacts/UpdatePrimaryEmail",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ contactId: contactId, email: email }),
            success: function () {
                // Reset all primary indicators and delete buttons to non-primary state
                $("#emailList .emailListItem").each(function () {
                    $(this).find(".primary-indicator").removeClass("badge badge-success").html('<a class="pointer setPrimary primary-indicator">Set Primary</a>');
                    $(this).find("a.redText").addClass("removeEmail pointer").html('X');
                });

                // Update the newly set primary email
                let newPrimaryEmail = $("#emailList .emailListItem").filter(function () {
                    return $(this).data("email") === email;
                });
                newPrimaryEmail.find(".primary-indicator").addClass("badge badge-success").html('Primary');
                newPrimaryEmail.find("a.redText").removeClass("removeEmail pointer").html('');
            },
            error: function () {
                // Handle error
            }
        });
    });






    $(document).on("click", "#saveContactButton", function () {
        function getEmailAddresses() {
            return $(".emailListItem").map(function () {
                return {
                    Email: $(this).data("email"),
                    Type: $(this).data("type")
                }
            }).get();
        }

        function getAddresses() {
            return $(".addressListItem").map(function () {
                return {
                    street1: $(this).data("street1"),
                    street2: $(this).data("street2"),
                    city: $(this).data("city"),
                    state: $(this).data("state"),
                    zip: $(this).data("zip"),
                    Type: $(this).data("type")
                }
            }).get();
        }

        function validateInputs(data) {
            let isValid = true;
            $('.invalidMessage').hide();
            $('.form-control').removeClass("invalidInput");

            //name
            if (data.FirstName == "") {
                $('#editContactFirstName').addClass("invalidInput");
                $('#invalidFirstNameFeedback').show();
                isValid = false;
            }
            if (data.LastName == "") {
                $('#editContactLastName').addClass("invalidInput");
                $('#invalidLastNameFeedback').show();
                isValid = false;
            }

            //email
            if (data.NewEmail != "") {
                $('#newEmailAddress').addClass("invalidInput");
                $('#invalidEmailFeedback').show();
                isValid = false;
            }

            //address
            if (data.NewStreet != "") {
                $('#newAddressStreet1').addClass("invalidInput");
                $('#invalidAddressStreet1Feedback').show();
                isValid = false;
            }
            if (data.NewCity != "") {
                $('#newAddressCity').addClass("invalidInput");
                $('#invalidAddressCityFeedback').show();
                isValid = false;
            }
            if (data.NewState != "") {
                $('#newAddressState').addClass("invalidInput");
                $('#invalidAddressStateFeedback').show();
                isValid = false;
            }
            if (data.NewZip != "") {
                $('#newAddressZip').addClass("invalidInput");
                $('#invalidAddressZipFeedback').show();
                isValid = false;
            }

            return isValid;
        }

        let data = {
            ContactId: $("#contactId").val() || "00000000-0000-0000-0000-000000000000",
            Title: $("#editContactTitle").val(),
            FirstName: $("#editContactFirstName").val(),
            LastName: $("#editContactLastName").val(),
            DOB: $("#editContactDOB").val(),
            PrimaryEmail: $("#primaryEmailInput").val(),
            NewEmail: $("#newEmailAddress").val(),
            NewStreet: $("#newAddressStreet1").val(),
            NewCity: $("#newAddressCity").val(),
            NewState: $("#newAddressState").val(),
            NewZip: $("#newAddressZip").val(),
            Emails: getEmailAddresses(),
            Addresses: getAddresses()
        };

        let dataToCreate = {
            ContactId: $("#contactId").val() || "00000000-0000-0000-0000-000000000000",
            Title: $("#editContactTitle").val(),
            FirstName: $("#editContactFirstName").val(),
            LastName: $("#editContactLastName").val(),
            DOB: $("#editContactDOB").val(),
            PrimaryEmail: $("#primaryEmailInput").val(),
            Emails: getEmailAddresses(),
            Addresses: getAddresses()
        };

        if (validateInputs(data)) {
            $.ajax({
                type: "POST",
                url: "/Contacts/SaveContact",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(dataToCreate),
                datatype: "json",
                success: function () {
                    $('#modal-editContact').modal('hide');
                    $("#ServerErrorAlert").hide();
                    //loadContactTable();
                },
                error: function () {
                    $('#modal-editContact').modal('hide');
                    $("#ServerErrorAlert").show();
                }
            });
        }
        else {
            return false;
        }
    });

    $("#newContactButton").click(function () {
        $.ajax({
            type: "GET",
            url: "/Contacts/NewContact",
            contentType: "application/json; charset=utf-8",
            datatype: "json",
            success: function (data) {
                $('#EditContactModalContent').html(data);
                $('#modal-editContact').modal('show');
                $("#ServerErrorAlert").hide();
            },
            error: function () {
                $("#ServerErrorAlert").show();
            }
        });
    });

    $("#deleteContactConfirmed").click(function () {
        let id = $("#deleteContactConfirmed").data("id");
        $.ajax({
            type: "DELETE",
            url: "/Contacts/DeleteContact",
            data: { "Id": id },
            datatype: "json",
            success: function (data) {
                $("#ServerErrorAlert").hide();
                //loadContactTable(); 
            },
            error: function () {
                $("#ServerErrorAlert").show();
            }
        });
    });

    function loadContactTable() {
        $.ajax({
            type: "GET",
            url: "/Contacts/GetContacts",
            contentType: "application/json; charset=utf-8",
            datatype: "json",
            success: function (data) {
                $('#contactTable').html(data);
                $("#ServerErrorAlert").hide();
                $("#tableHeader").show();
            },
            error: function () {
                $("#ServerErrorAlert").show();
            }
        });
    }

    function validateEmail(email) {
        var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        if (email) {
            return regex.test(email);
        } else {
            return false;
        }
    }

    function validateAddress(street1, city, state, zip) {
        let isValid = true;

        if (!street1.trim()) {
            $('#newAddressStreet1').addClass("invalidInput");
            $('#invalidAddressStreet1Feedback').show();
            isValid = false;
        } else {
            $('#newAddressStreet1').removeClass("invalidInput");
            $('#invalidAddressStreet1Feedback').hide();
        }

        if (!city.trim()) {
            $('#newAddressCity').addClass("invalidInput");
            $('#invalidAddressCityFeedback').show();
            isValid = false;
        } else {
            $('#newAddressCity').removeClass("invalidInput");
            $('#invalidAddressCityFeedback').hide();
        }

        if (!state.trim()) {
            $('#newAddressState').addClass("invalidInput");
            $('#invalidAddressStateFeedback').show();
            isValid = false;
        } else {
            $('#newAddressState').removeClass("invalidInput");
            $('#invalidAddressStateFeedback').hide();
        }

        if (!zip.trim()) {
            $('#newAddressZip').addClass("invalidInput");
            $('#invalidAddressZipFeedback').show();
            isValid = false;
        } else {
            $('#newAddressZip').removeClass("invalidInput");
            $('#invalidAddressZipFeedback').hide();
        }

        return isValid;
    }

    function initSignalr() {
        var connection = new signalR.HubConnectionBuilder().withUrl("/contactHub").build();

        connection.on("Update", function () {
            //console.log("update");
            loadContactTable();
        });

        connection.start();
    }
});